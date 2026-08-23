# Society Maintenance Tracker

A production-quality full-stack web application for apartment/society maintenance management.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)](https://react.dev)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](https://postgresql.org)

---

## Features

### Resident Features
- Register and log in securely
- Raise maintenance complaints with:
  - Category selection (Plumbing, Electrical, Cleaning, Security, Lift/Elevator, Water Supply, Parking, Common Area, Other)
  - Detailed description
  - Optional photo upload
- View all own complaints with status and priority
- View complete immutable status history with timeline
- View society notices (important ones pinned to top)
- Receive email notifications when complaint status changes
- Receive email notifications for important notices

### Admin Features
- View all complaints across the society
- Filter by category, status, and date range
- Set complaint priority (Low, Medium, High)
- Update complaint status (Open → In Progress → Resolved)
- Every status change creates an immutable audit history record
- Detect and surface overdue complaints (configurable threshold)
- Create, pin, and delete society notices
- Mark notices as important (triggers email to all residents)
- Dashboard with statistics and charts:
  - Total complaints by status
  - Complaints by category
  - Overdue complaint count and list
- Configure the overdue threshold (days)

---

## Architecture

```mermaid
flowchart LR
    Frontend[React + Vite<br/>TypeScript + Tailwind] --> API[FastAPI Backend]
    API --> DB[(PostgreSQL<br/>Neon)]
    API --> Storage[Cloudinary<br/>Image Storage]
    API --> Email[Resend<br/>Email Service]
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Vanilla CSS (custom design system) |
| State | TanStack Query (React Query) |
| Routing | React Router v6 |
| Backend | Python + FastAPI |
| Validation | Pydantic v2 |
| ORM | SQLAlchemy 2.x |
| Migrations | Alembic |
| Auth | JWT (python-jose) + passlib/bcrypt |
| Database | PostgreSQL |
| Images | Cloudinary |
| Email | Resend |
| Deploy FE | Vercel |
| Deploy BE | Render |
| Deploy DB | Neon |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (local or Neon)

### Clone

```bash
git clone https://github.com/OmKsaga/Society-Maintenance-Tracker.git
cd Society-Maintenance-Tracker
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/db` |
| `JWT_SECRET` | JWT signing secret (keep private) | `your-random-secret` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry in minutes | `60` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `mycloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abc...` |
| `RESEND_API_KEY` | Resend API key | `re_...` |
| `EMAIL_FROM` | Sender email address | `noreply@yourdomain.com` |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | `http://localhost:5173` |
| `OVERDUE_DAYS` | Default overdue threshold (days) | `3` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |

> ⚠️ **Never commit real `.env` files containing secrets to Git.**

---

## Database Setup

Run Alembic migrations to create all tables:

```bash
cd backend
.venv\Scripts\activate
alembic upgrade head
```

---

## Seed Data

Populate the database with demo data:

```bash
cd backend
.venv\Scripts\activate
python seed.py
```

### Demo Accounts

> ⚠️ These are **development-only** accounts. Never use in production.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin@123` |
| Resident | `priya@example.com` | `Resident@123` |
| Resident | `rahul@example.com` | `Resident@123` |
| Resident | `anjali@example.com` | `Resident@123` |

---

## Running Locally

### Backend

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000

### Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:5173

---

## API Documentation

Once the backend is running, access the auto-generated API docs:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

---

## Running Tests

```bash
cd backend
.venv\Scripts\activate
pytest tests/ -v
```

Tests use SQLite in-memory — no PostgreSQL required to run tests.

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the following:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables in Render dashboard

### Frontend → Vercel

1. Import your GitHub repository in [Vercel](https://vercel.com)
2. Set the following:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`

### Database → Neon

1. Create a free PostgreSQL database at [Neon](https://neon.tech)
2. Copy the connection string
3. Set `DATABASE_URL` in your Render environment variables
4. Run migrations: `alembic upgrade head`

### Cloudinary (Image Storage)

1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Set the three `CLOUDINARY_*` environment variables

### Resend (Email)

1. Sign up at [Resend](https://resend.com)
2. Create an API key
3. Set `RESEND_API_KEY` and `EMAIL_FROM` environment variables

---

## Project Structure

```
Society-Maintenance-Tracker/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/Sidebar.tsx
│   │   │   ├── complaints/ComplaintComponents.tsx
│   │   │   └── ui/Toaster.tsx
│   │   ├── pages/
│   │   │   ├── resident/
│   │   │   └── admin/
│   │   ├── services/api.ts
│   │   ├── context/AuthContext.tsx
│   │   ├── types/index.ts
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── alembic/
│   ├── tests/
│   ├── seed.py
│   └── requirements.txt
├── docs/
│   └── system-design.md
└── README.md
```

---

## Security Notes

- Passwords are hashed with bcrypt (never stored in plaintext)
- JWT tokens expire after 60 minutes (configurable)
- Server-side role enforcement: residents cannot access admin endpoints
- File uploads validated for type and size server-side
- CORS configured to allow only specified origins
- No secrets committed to version control
>>>>>>> df80c8c (feat: complete full-stack implementation)
