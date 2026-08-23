"""Tests for complaint management."""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from tests.conftest import get_auth_headers
from app.models import Complaint, ComplaintHistory, ComplaintStatus, ComplaintCategory, ComplaintPriority


def test_create_complaint(client, resident_user):
    headers = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "PLUMBING",
        "description": "Water leakage near kitchen pipe causing damage.",
    }, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["category"] == "PLUMBING"
    assert data["status"] == "OPEN"
    assert data["priority"] == "MEDIUM"
    assert data["resident_id"] == resident_user.id
    # Initial history record created
    assert len(data["history"]) == 1
    assert data["history"][0]["new_status"] == "OPEN"


def test_create_complaint_invalid_category(client, resident_user):
    headers = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "INVALID_CATEGORY",
        "description": "Some description here.",
    }, headers=headers)
    assert resp.status_code == 400


def test_create_complaint_description_too_short(client, resident_user):
    headers = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "PLUMBING",
        "description": "Short",
    }, headers=headers)
    assert resp.status_code == 400


def test_resident_sees_own_complaints(client, resident_user, db):
    headers = get_auth_headers(client, "resident@example.com", "Resident@123")
    # Create 2 complaints
    for _ in range(2):
        client.post("/api/complaints", data={
            "category": "CLEANING",
            "description": "Garbage pile-up near the main entrance gate.",
        }, headers=headers)

    resp = client.get("/api/complaints/my", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_resident_cannot_see_another_residents_complaint(client, resident_user, resident2_user, db):
    # Create complaint as resident2
    headers2 = get_auth_headers(client, "other@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "ELECTRICAL",
        "description": "Power fluctuations in the main hall area.",
    }, headers=headers2)
    complaint_id = resp.json()["id"]

    # Try to access as resident1
    headers1 = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.get(f"/api/complaints/{complaint_id}", headers=headers1)
    assert resp.status_code == 403


def test_admin_sees_all_complaints(client, admin_user, resident_user, resident2_user, db):
    # Create complaints as two different residents
    h1 = get_auth_headers(client, "resident@example.com", "Resident@123")
    h2 = get_auth_headers(client, "other@example.com", "Resident@123")
    client.post("/api/complaints", data={"category": "PLUMBING", "description": "Water leak in bathroom area."}, headers=h1)
    client.post("/api/complaints", data={"category": "SECURITY", "description": "CCTV camera not working properly."}, headers=h2)

    hadmin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.get("/api/admin/complaints", headers=hadmin)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_status_lifecycle_open_to_in_progress(client, admin_user, resident_user, db):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "PLUMBING",
        "description": "Water leak in bathroom area causes flooding.",
    }, headers=h_res)
    complaint_id = resp.json()["id"]

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.patch(f"/api/admin/complaints/{complaint_id}/status", json={
        "status": "IN_PROGRESS",
        "note": "Technician assigned",
    }, headers=h_admin)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "IN_PROGRESS"
    assert len(data["history"]) == 2
    assert data["history"][1]["old_status"] == "OPEN"
    assert data["history"][1]["new_status"] == "IN_PROGRESS"
    assert data["history"][1]["note"] == "Technician assigned"


def test_status_lifecycle_in_progress_to_resolved(client, admin_user, resident_user, db):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "ELECTRICAL",
        "description": "Power fluctuations in the main hall area daily.",
    }, headers=h_res)
    complaint_id = resp.json()["id"]

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "IN_PROGRESS"}, headers=h_admin)
    resp = client.patch(f"/api/admin/complaints/{complaint_id}/status", json={
        "status": "RESOLVED", "note": "Fixed"
    }, headers=h_admin)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "RESOLVED"
    assert data["resolved_at"] is not None


def test_invalid_status_transition_resolved_to_open(client, admin_user, resident_user, db):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "CLEANING",
        "description": "Garbage pile-up near the main entrance gate.",
    }, headers=h_res)
    complaint_id = resp.json()["id"]

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "IN_PROGRESS"}, headers=h_admin)
    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "RESOLVED"}, headers=h_admin)
    # Try to reopen
    resp = client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "OPEN"}, headers=h_admin)
    assert resp.status_code == 409


def test_invalid_transition_open_to_resolved(client, admin_user, resident_user, db):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "PARKING",
        "description": "Unauthorized vehicles parked in designated resident spots.",
    }, headers=h_res)
    complaint_id = resp.json()["id"]

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.patch(f"/api/admin/complaints/{complaint_id}/status", json={"status": "RESOLVED"}, headers=h_admin)
    assert resp.status_code == 409


def test_history_immutability(client, admin_user, resident_user, db):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "WATER_SUPPLY",
        "description": "No water supply on 4th floor for three days.",
    }, headers=h_res)
    complaint_id = resp.json()["id"]

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    client.patch(f"/api/admin/complaints/{complaint_id}/status", json={
        "status": "IN_PROGRESS", "note": "Plumber assigned"
    }, headers=h_admin)

    resp = client.get(f"/api/complaints/{complaint_id}", headers=h_admin)
    history = resp.json()["history"]
    assert len(history) == 2
    assert history[0]["new_status"] == "OPEN"
    assert history[1]["old_status"] == "OPEN"
    assert history[1]["new_status"] == "IN_PROGRESS"
    assert history[1]["note"] == "Plumber assigned"
    assert history[1]["actor"]["email"] == "testadmin@example.com"


def test_overdue_complaint_detected(client, admin_user, resident_user, db):
    # Create complaint 5 days ago (overdue threshold = 3)
    complaint = Complaint(
        resident_id=resident_user.id,
        category=ComplaintCategory.LIFT_ELEVATOR,
        description="Lift is making grinding noise and sometimes gets stuck.",
        priority=ComplaintPriority.HIGH,
        status=ComplaintStatus.OPEN,
        created_at=datetime.now(timezone.utc) - timedelta(days=5),
    )
    db.add(complaint)
    history = ComplaintHistory(
        complaint_id=None,
        actor_id=resident_user.id,
        old_status=None,
        new_status=ComplaintStatus.OPEN,
        note="Complaint submitted",
    )
    db.flush()
    history.complaint_id = complaint.id
    db.add(history)
    db.commit()

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.get("/api/admin/complaints", headers=h_admin)
    assert resp.status_code == 200
    complaints = resp.json()
    overdue = [c for c in complaints if c["id"] == complaint.id]
    assert len(overdue) == 1
    assert overdue[0]["is_overdue"] is True


def test_resolved_old_complaint_not_overdue(client, admin_user, resident_user, db):
    complaint = Complaint(
        resident_id=resident_user.id,
        category=ComplaintCategory.PARKING,
        description="Unauthorized vehicles parked in designated resident spots daily.",
        priority=ComplaintPriority.LOW,
        status=ComplaintStatus.RESOLVED,
        created_at=datetime.now(timezone.utc) - timedelta(days=10),
        resolved_at=datetime.now(timezone.utc) - timedelta(days=8),
    )
    db.add(complaint)
    db.flush()
    db.add(ComplaintHistory(
        complaint_id=complaint.id, actor_id=resident_user.id,
        old_status=None, new_status=ComplaintStatus.OPEN, note="Complaint submitted",
    ))
    db.commit()

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.get("/api/admin/complaints", headers=h_admin)
    complaints = resp.json()
    found = next((c for c in complaints if c["id"] == complaint.id), None)
    assert found is not None
    assert found["is_overdue"] is False


def test_resident_cannot_update_status(client, resident_user, admin_user, db):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "SECURITY",
        "description": "CCTV camera near gate 2 not working since last week.",
    }, headers=h_res)
    complaint_id = resp.json()["id"]

    resp = client.patch(f"/api/admin/complaints/{complaint_id}/status", json={
        "status": "IN_PROGRESS"
    }, headers=h_res)
    assert resp.status_code == 403


def test_priority_update(client, admin_user, resident_user, db):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/complaints", data={
        "category": "ELECTRICAL",
        "description": "Frequent power fluctuations in block B third floor.",
    }, headers=h_res)
    complaint_id = resp.json()["id"]

    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.patch(f"/api/admin/complaints/{complaint_id}/priority", json={
        "priority": "HIGH"
    }, headers=h_admin)
    assert resp.status_code == 200
    assert resp.json()["priority"] == "HIGH"
