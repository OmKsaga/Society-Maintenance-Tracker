# System Design: Society Maintenance Tracker

## Overview

A monolithic full-stack web application for apartment/society maintenance management. The architecture is deliberately simple, clean, and maintainable — no microservices, no event queues, no unnecessary infrastructure.

---

## Database Architecture

### Schema Design

The schema has five tables:

```
users ──────< complaints ──────< complaint_history
  │                                     │
  │                                     └─ actor_id → users
  │
  └──────< notices
  │
  └──── settings (single row)
```

**Key design decisions:**

- `users.role` is an enum (`RESIDENT | ADMIN`) stored as a VARCHAR with a check constraint
- `complaints.status` follows a strict lifecycle enforced at the application layer
- `complaint_history` is insert-only — no UPDATE or DELETE operations are permitted on it
- `settings` is a single-row configuration table (id=1 always)
- All timestamps use `DateTime(timezone=True)` for proper UTC storage

### Indexes

- `users.email` — unique index for login lookups
- `complaints.resident_id` — for resident's "my complaints" queries
- `complaints.created_at` — for date-range filters and overdue detection
- `complaint_history.complaint_id` — for timeline queries
- `complaint_history.created_at` — for ordering history chronologically

---

## Complaint History Model

Every status change creates an **immutable** `complaint_history` record:

```python
ComplaintHistory(
    complaint_id=...,  # which complaint
    actor_id=...,      # which admin performed the action
    old_status=...,    # previous status (null for initial creation)
    new_status=...,    # new status after change
    note=...,          # optional admin comment
    created_at=...     # UTC timestamp (auto-set)
)
```

**Immutability is enforced by:** only ever calling `INSERT` on this table. There is no API endpoint for UPDATE/DELETE of history records. The initial complaint creation also creates the first history record (`None → OPEN`) so the timeline is always complete.

---

## Complaint Lifecycle

Valid transitions are encoded as a dictionary in the backend:

```
OPEN → IN_PROGRESS → RESOLVED
```

Invalid transitions (e.g., `RESOLVED → OPEN`, `OPEN → RESOLVED`) return HTTP 409 Conflict. When a complaint reaches `RESOLVED`, `resolved_at` is stamped with the current UTC time.

---

## Overdue Detection

Overdue state is **computed dynamically** — never persisted as a boolean column. This avoids stale data.

```python
def is_overdue(complaint, overdue_days) -> bool:
    if complaint.status == RESOLVED:
        return False
    threshold = complaint.created_at + timedelta(days=overdue_days)
    return now_utc() > threshold
```

The `overdue_days` value comes from the `settings` table (admin-configurable). Admin complaint lists sort overdue complaints to the top before returning results.

---

## Photo Handling

```
Browser (multipart/form-data)
    ↓
FastAPI validates: MIME type + file size (≤ 5 MB)
    ↓
Cloudinary SDK uploads the file
    ↓
Returns (secure_url, public_id)
    ↓
PostgreSQL stores url + public_id in complaints row
    ↓
Frontend renders <img src={photo_url} />
```

Image binary data is **never stored in PostgreSQL**. Only the Cloudinary URL and public identifier are persisted. If Cloudinary is not configured, the upload returns HTTP 503 with a clear error — other complaint functionality is unaffected.

---

## Notification Flow

Email notifications are sent **after** the database transaction commits. A failure in email sending **never rolls back the database change**.

### Status Change Email

```
Admin updates status
    ↓
DB: complaint.status updated + history record created
    ↓
DB transaction committed (success)
    ↓
try: Resend API → resident email
except: log error, continue
    ↓
HTTP 200 response with updated complaint
```

### Important Notice Email

```
Admin creates notice with is_important=True
    ↓
DB: notice created
    ↓
Query: all users with role=RESIDENT → collect emails
    ↓
try: Resend API → bulk email to residents
except: log error, continue
    ↓
HTTP 201 response with notice
```

If `RESEND_API_KEY` is not set, the notification service logs a message and returns early — no exception is raised.

---

## Authentication & Authorization

### JWT Flow

1. Client sends credentials to `POST /api/auth/login`
2. Server verifies password with bcrypt
3. Server returns JWT with `{ sub: user_id, role: USER_ROLE, exp: ... }`
4. Client stores token in `localStorage`
5. Subsequent requests include `Authorization: Bearer <token>`

### Role Enforcement

Two FastAPI dependency functions:

- `get_current_user` — verifies JWT and fetches user, used for authenticated endpoints
- `get_current_admin` — wraps `get_current_user`, additionally checks `role == ADMIN`

Server-side enforcement means frontend route guards are defense-in-depth only — the API itself rejects unauthorized calls.

### Password Security

Passwords are hashed with **bcrypt** via `passlib`. Plain-text passwords are never stored or logged. The hash is never returned in API responses.

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│              Vercel (CDN)               │
│         React SPA (static files)        │
└────────────────────┬────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────┐
│              Render                      │
│         FastAPI (uvicorn)               │
└──────┬────────────────────┬─────────────┘
       │                    │
┌──────▼──────┐   ┌─────────▼─────────────┐
│ Neon        │   │ Cloudinary / Resend   │
│ PostgreSQL  │   │ (external services)   │
└─────────────┘   └───────────────────────┘
```

- **Vercel**: Hosts the compiled Vite/React SPA. Auto-deploys on `git push main`.
- **Render**: Runs `uvicorn app.main:app`. Scales to zero on free tier. Environment variables configured in Render dashboard.
- **Neon**: Serverless PostgreSQL with connection pooling. The `DATABASE_URL` connection string is the only configuration needed.
- **Cloudinary**: Object storage for complaint photos. Credentials stored in environment variables.
- **Resend**: Transactional email. API key stored in environment variable.

---

## Key Design Principles

1. **No stale booleans** — overdue state is computed, not stored
2. **Immutable audit log** — complaint_history is append-only
3. **Email resilience** — email failures never break core operations
4. **Server-side authorization** — role checks happen in API, not just frontend
5. **Clean monolith** — no unnecessary infrastructure; straightforward to understand and deploy
