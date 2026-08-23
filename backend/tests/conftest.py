"""
Pytest configuration with test database setup.
Uses SQLite in-memory for speed (no PostgreSQL required for tests).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import User, Setting
from app.models import UserRole
from app.utils.security import hash_password

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# SQLite doesn't support native enum types — let SQLAlchemy render them as VARCHAR
from sqlalchemy.dialects import sqlite as sqlite_dialect

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    # Create all tables using SQLAlchemy metadata (bypasses alembic/postgres enums)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        # Seed default settings row
        existing = session.query(Setting).filter(Setting.id == 1).first()
        if not existing:
            setting = Setting(id=1, overdue_days=3)
            session.add(setting)
            session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    user = User(
        name="Test Admin",
        email="testadmin@example.com",
        password_hash=hash_password("Admin@123"),
        role=UserRole.ADMIN,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def resident_user(db):
    user = User(
        name="Test Resident",
        email="resident@example.com",
        password_hash=hash_password("Resident@123"),
        role=UserRole.RESIDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def resident2_user(db):
    user = User(
        name="Other Resident",
        email="other@example.com",
        password_hash=hash_password("Resident@123"),
        role=UserRole.RESIDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_headers(client: TestClient, email: str, password: str) -> dict:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
