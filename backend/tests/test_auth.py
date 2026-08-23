"""Tests for authentication endpoints."""
import pytest
from fastapi.testclient import TestClient


def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "name": "New User",
        "email": "newuser@example.com",
        "password": "Password@123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["role"] == "RESIDENT"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]


def test_register_duplicate_email(client):
    payload = {"name": "User", "email": "dup@example.com", "password": "Password@123"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


def test_register_weak_password(client):
    resp = client.post("/api/auth/register", json={
        "name": "User",
        "email": "weak@example.com",
        "password": "123",
    })
    assert resp.status_code == 422


def test_login_success(client, resident_user):
    resp = client.post("/api/auth/login", json={
        "email": "resident@example.com",
        "password": "Resident@123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_invalid_password(client, resident_user):
    resp = client.post("/api/auth/login", json={
        "email": "resident@example.com",
        "password": "WrongPassword",
    })
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "Password@123",
    })
    assert resp.status_code == 401


def test_me_authenticated(client, resident_user):
    from tests.conftest import get_auth_headers
    headers = get_auth_headers(client, "resident@example.com", "Resident@123")
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "resident@example.com"


def test_me_unauthenticated(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 403


def test_me_invalid_token(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401
