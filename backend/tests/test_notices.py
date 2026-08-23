"""Tests for notices."""
import pytest
from tests.conftest import get_auth_headers


def test_admin_create_notice(client, admin_user):
    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.post("/api/admin/notices", json={
        "title": "Water Maintenance Tomorrow",
        "content": "Water supply will be interrupted tomorrow from 10 AM to 2 PM.",
        "is_important": True,
    }, headers=h_admin)
    assert resp.status_code == 201
    data = resp.json()
    assert data["is_important"] is True
    assert data["title"] == "Water Maintenance Tomorrow"


def test_resident_cannot_create_notice(client, resident_user):
    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.post("/api/admin/notices", json={
        "title": "Test Notice",
        "content": "Content here.",
    }, headers=h_res)
    assert resp.status_code == 403


def test_resident_can_view_notices(client, admin_user, resident_user):
    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    client.post("/api/admin/notices", json={
        "title": "Normal Notice",
        "content": "Some general information.",
        "is_important": False,
    }, headers=h_admin)
    client.post("/api/admin/notices", json={
        "title": "Important Notice",
        "content": "Urgent information!",
        "is_important": True,
    }, headers=h_admin)

    h_res = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.get("/api/notices", headers=h_res)
    assert resp.status_code == 200
    notices = resp.json()
    assert len(notices) == 2
    # Important notices should come first
    assert notices[0]["is_important"] is True


def test_important_notice_identified(client, admin_user, resident_user):
    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.post("/api/admin/notices", json={
        "title": "Critical Alert",
        "content": "Emergency maintenance scheduled.",
        "is_important": True,
    }, headers=h_admin)
    assert resp.json()["is_important"] is True


def test_admin_delete_notice(client, admin_user):
    h_admin = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.post("/api/admin/notices", json={
        "title": "To Delete",
        "content": "This notice will be deleted.",
    }, headers=h_admin)
    notice_id = resp.json()["id"]

    resp = client.delete(f"/api/admin/notices/{notice_id}", headers=h_admin)
    assert resp.status_code == 204

    # Verify deleted
    h_res = get_auth_headers(client, "testadmin@example.com", "Admin@123")
    resp = client.get("/api/notices", headers=h_res)
    ids = [n["id"] for n in resp.json()]
    assert notice_id not in ids
