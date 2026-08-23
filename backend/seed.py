"""
Seed script for development/demo data.
WARNING: Only use in development environments.
DO NOT run against production databases.

Usage:
    cd backend
    python seed.py
"""
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models import Base, User, Complaint, ComplaintHistory, Notice, Setting
from app.models import UserRole, ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.utils.security import hash_password

def seed():
    db = SessionLocal()
    try:
        print("🌱 Seeding development data...")

        # Clear existing data (dev only)
        db.query(ComplaintHistory).delete()
        db.query(Complaint).delete()
        db.query(Notice).delete()
        db.query(Setting).delete()
        db.query(User).delete()
        db.commit()

        # ── Users ──
        admin = User(
            name="Admin User",
            email="admin@example.com",
            password_hash=hash_password("Admin@123"),
            role=UserRole.ADMIN,
        )
        resident1 = User(
            name="Priya Sharma",
            email="priya@example.com",
            password_hash=hash_password("Resident@123"),
            role=UserRole.RESIDENT,
        )
        resident2 = User(
            name="Rahul Mehta",
            email="rahul@example.com",
            password_hash=hash_password("Resident@123"),
            role=UserRole.RESIDENT,
        )
        resident3 = User(
            name="Anjali Patel",
            email="anjali@example.com",
            password_hash=hash_password("Resident@123"),
            role=UserRole.RESIDENT,
        )
        db.add_all([admin, resident1, resident2, resident3])
        db.flush()

        # ── Settings ──
        setting = Setting(id=1, overdue_days=3)
        db.add(setting)

        now = datetime.now(timezone.utc)

        # ── Complaints ──

        # 1. Open complaint (recent, not overdue)
        c1 = Complaint(
            resident_id=resident1.id,
            category=ComplaintCategory.PLUMBING,
            description="Water leakage near kitchen pipe causing damage to the floor.",
            priority=ComplaintPriority.HIGH,
            status=ComplaintStatus.OPEN,
            created_at=now - timedelta(hours=5),
        )
        db.add(c1)
        db.flush()
        db.add(ComplaintHistory(
            complaint_id=c1.id, actor_id=resident1.id,
            old_status=None, new_status=ComplaintStatus.OPEN,
            note="Complaint submitted",
        ))

        # 2. In Progress complaint
        c2 = Complaint(
            resident_id=resident1.id,
            category=ComplaintCategory.ELECTRICAL,
            description="Frequent power fluctuations in block B, third floor. Lights flickering constantly.",
            priority=ComplaintPriority.MEDIUM,
            status=ComplaintStatus.IN_PROGRESS,
            created_at=now - timedelta(days=2),
        )
        db.add(c2)
        db.flush()
        db.add(ComplaintHistory(
            complaint_id=c2.id, actor_id=resident1.id,
            old_status=None, new_status=ComplaintStatus.OPEN,
            note="Complaint submitted",
        ))
        db.add(ComplaintHistory(
            complaint_id=c2.id, actor_id=admin.id,
            old_status=ComplaintStatus.OPEN, new_status=ComplaintStatus.IN_PROGRESS,
            note="Electrician assigned, will visit tomorrow",
        ))

        # 3. Resolved complaint
        c3 = Complaint(
            resident_id=resident1.id,
            category=ComplaintCategory.CLEANING,
            description="Garbage pile-up near the main entrance gate.",
            priority=ComplaintPriority.LOW,
            status=ComplaintStatus.RESOLVED,
            created_at=now - timedelta(days=7),
            resolved_at=now - timedelta(days=5),
        )
        db.add(c3)
        db.flush()
        db.add(ComplaintHistory(
            complaint_id=c3.id, actor_id=resident1.id,
            old_status=None, new_status=ComplaintStatus.OPEN,
            note="Complaint submitted",
        ))
        db.add(ComplaintHistory(
            complaint_id=c3.id, actor_id=admin.id,
            old_status=ComplaintStatus.OPEN, new_status=ComplaintStatus.IN_PROGRESS,
            note="Cleaning staff informed",
        ))
        db.add(ComplaintHistory(
            complaint_id=c3.id, actor_id=admin.id,
            old_status=ComplaintStatus.IN_PROGRESS, new_status=ComplaintStatus.RESOLVED,
            note="Area cleaned and sanitized",
        ))

        # 4. Overdue complaint (created 5 days ago, still OPEN, threshold=3)
        c4 = Complaint(
            resident_id=resident2.id,
            category=ComplaintCategory.LIFT_ELEVATOR,
            description="Lift is making grinding noise and sometimes gets stuck between floors.",
            priority=ComplaintPriority.HIGH,
            status=ComplaintStatus.OPEN,
            created_at=now - timedelta(days=5),
        )
        db.add(c4)
        db.flush()
        db.add(ComplaintHistory(
            complaint_id=c4.id, actor_id=resident2.id,
            old_status=None, new_status=ComplaintStatus.OPEN,
            note="Complaint submitted",
        ))

        # 5. Another overdue complaint
        c5 = Complaint(
            resident_id=resident3.id,
            category=ComplaintCategory.WATER_SUPPLY,
            description="No water supply on 4th floor for the past 3 days. Urgent attention needed.",
            priority=ComplaintPriority.HIGH,
            status=ComplaintStatus.IN_PROGRESS,
            created_at=now - timedelta(days=4),
        )
        db.add(c5)
        db.flush()
        db.add(ComplaintHistory(
            complaint_id=c5.id, actor_id=resident3.id,
            old_status=None, new_status=ComplaintStatus.OPEN,
            note="Complaint submitted",
        ))
        db.add(ComplaintHistory(
            complaint_id=c5.id, actor_id=admin.id,
            old_status=ComplaintStatus.OPEN, new_status=ComplaintStatus.IN_PROGRESS,
            note="Plumber scheduled for inspection",
        ))

        # 6. Security complaint
        c6 = Complaint(
            resident_id=resident2.id,
            category=ComplaintCategory.SECURITY,
            description="CCTV camera near gate 2 not working since last week.",
            priority=ComplaintPriority.MEDIUM,
            status=ComplaintStatus.OPEN,
            created_at=now - timedelta(hours=12),
        )
        db.add(c6)
        db.flush()
        db.add(ComplaintHistory(
            complaint_id=c6.id, actor_id=resident2.id,
            old_status=None, new_status=ComplaintStatus.OPEN,
            note="Complaint submitted",
        ))

        # 7. Parking complaint
        c7 = Complaint(
            resident_id=resident3.id,
            category=ComplaintCategory.PARKING,
            description="Unauthorized vehicles parked in designated resident spots.",
            priority=ComplaintPriority.LOW,
            status=ComplaintStatus.RESOLVED,
            created_at=now - timedelta(days=10),
            resolved_at=now - timedelta(days=8),
        )
        db.add(c7)
        db.flush()
        db.add(ComplaintHistory(
            complaint_id=c7.id, actor_id=resident3.id,
            old_status=None, new_status=ComplaintStatus.OPEN,
            note="Complaint submitted",
        ))
        db.add(ComplaintHistory(
            complaint_id=c7.id, actor_id=admin.id,
            old_status=ComplaintStatus.OPEN, new_status=ComplaintStatus.IN_PROGRESS,
            note="Notice sent to violators",
        ))
        db.add(ComplaintHistory(
            complaint_id=c7.id, actor_id=admin.id,
            old_status=ComplaintStatus.IN_PROGRESS, new_status=ComplaintStatus.RESOLVED,
            note="Issue resolved, parking barriers installed",
        ))

        # ── Notices ──
        n1 = Notice(
            title="Water Supply Maintenance — Tomorrow 10 AM to 2 PM",
            content="Dear Residents, water supply will be interrupted tomorrow (24 Aug) from 10:00 AM to 2:00 PM due to maintenance work on the main pipeline. Please store adequate water in advance. Inconvenience is regretted.",
            is_important=True,
            created_by=admin.id,
            created_at=now - timedelta(hours=2),
        )
        n2 = Notice(
            title="Parking Area Cleaning — This Saturday",
            content="The parking area will undergo a thorough cleaning this Saturday. Please park your vehicles in the designated overflow area on Level 2. Normal parking will resume by Sunday morning.",
            is_important=False,
            created_by=admin.id,
            created_at=now - timedelta(days=1),
        )
        n3 = Notice(
            title="Society Annual General Meeting — 30 August",
            content="The Annual General Meeting of the Residents' Welfare Association will be held on 30th August 2026 at 6:00 PM in the Community Hall. All residents are requested to attend.",
            is_important=True,
            created_by=admin.id,
            created_at=now - timedelta(days=2),
        )
        n4 = Notice(
            title="Gym Timings Update",
            content="The society gym timings have been updated. New timings: Weekdays 5:30 AM – 10:00 PM, Weekends 6:00 AM – 9:00 PM.",
            is_important=False,
            created_by=admin.id,
            created_at=now - timedelta(days=3),
        )
        db.add_all([n1, n2, n3, n4])

        db.commit()
        print("✅ Seed completed successfully!")
        print()
        print("Demo Accounts:")
        print("  Admin:     admin@example.com    / Admin@123")
        print("  Resident1: priya@example.com    / Resident@123")
        print("  Resident2: rahul@example.com    / Resident@123")
        print("  Resident3: anjali@example.com   / Resident@123")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
