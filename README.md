# MIT M&E System

**Ministry of Industry and Trade — Monitoring & Evaluation System**

A full-stack web application for tracking performance against the MIT Strategic Plan 2026/27–2030/31 across MIT Headquarters and 13 affiliated institutions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, Zustand |
| Backend | Node.js, Express.js, Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | JWT (access 15m + refresh 7d) |
| Server | PM2, HTTPS (self-signed cert) |

---

## Project Structure

```
mit-mes/
├── frontend/          # React 18 + Vite SPA
│   └── src/
│       ├── pages/     # All page components
│       ├── components/# Reusable UI components
│       ├── api/       # Axios API client + all endpoints
│       └── store/     # Zustand auth store
│
├── backend/           # Express.js REST API
│   ├── src/
│   │   ├── modules/   # Feature modules (auth, indicators, etc.)
│   │   ├── middleware/ # Auth, audit logging
│   │   └── app.js     # Server entry point
│   └── prisma/
│       ├── schema.prisma  # Database schema (35 models)
│       ├── seed.js        # Demo data seeder
│       └── migrations/    # Database migration history
│
├── USER_MANUAL.md         # End-user documentation
└── MIT_MES_User_Manual.docx  # User manual (Word format)
```

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js** v18 or later — https://nodejs.org
- **PostgreSQL** v14 or later — https://postgresql.org
- **npm** v9 or later (comes with Node.js)
- **Git** — https://git-scm.com

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/mit-mes.git
cd mit-mes
```

### 2. Set up the database

```sql
-- Run in psql or pgAdmin
CREATE USER mit_user WITH PASSWORD 'your_password';
CREATE DATABASE mit_mes OWNER mit_user;
GRANT ALL PRIVILEGES ON DATABASE mit_mes TO mit_user;
```

### 3. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your values:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — generate a strong 64-character random string
- `JWT_REFRESH_SECRET` — another strong random string
- `APP_URL` — your server IP/domain with port

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Run database migrations

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 6. Seed demo data

```bash
cd backend
npm run db:seed
```

This creates:
- 14 institutions (MIT-HQ + 13 agencies)
- 63 users across all institutions
- 8 Strategic Objectives, 14 Outcomes, 19 Outputs, 57 Activities
- 44 Indicators with FY 2025-2026 targets
- Sample budget plans and expenditure records

---

## Running the System

### Development mode

```bash
# Terminal 1 — Backend
cd backend
node src/app.js

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Frontend: http://localhost:5173
Backend API: http://localhost:5000

### Production mode (PM2 + HTTPS)

#### Generate SSL certificate (self-signed for internal use)

```bash
mkdir backend/certs
cd backend/certs
openssl req -x509 -newkey rsa:2048 -nodes -out cert.pem -keyout key.pem -days 365 \
  -subj "/C=TZ/ST=Dar es Salaam/L=Dar es Salaam/O=MIT Tanzania/CN=mit.go.tz"
```

#### Start with PM2

```bash
cd backend
npm install -g pm2
pm2 start src/app.js --name mit-mes --interpreter node
pm2 save
pm2 startup   # auto-start on server reboot
```

#### Build frontend for production

```bash
cd frontend
npm run build
# Built files go to frontend/dist/ — served automatically by the backend
```

Access the system at: `https://YOUR_SERVER_IP:5443`

---

## Default Credentials (demo data)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@mit.go.tz | Admin@1234 |
| Institution Admin (e.g. BRELA) | admin@brela.go.tz | Passw0rd@MIT |
| M&E Officer | meofficer@brela.go.tz | Passw0rd@MIT |

> **Important:** Change all passwords immediately after first login in a production deployment.

---

## User Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full system access — manages all institutions, users, and configuration |
| `admin` | Institution-level admin — manages users within their institution |
| `me_officer` | M&E Officer — manages indicators, approves data submissions |
| `data_collector` | Submits indicator data for their institution |
| `viewer` | Read-only access to dashboards and reports |

---

## Key Features

- **Results Framework** — Hierarchical Strategic Objectives → Outcomes → Outputs → Activities
- **Indicators** — 6 formula types, quarterly/annual targets, achievement tracking
- **Data Entry & Approval** — Multi-stage workflow with audit trail
- **Activity Workplan** — Milestone tracking with overdue detection
- **Projects** — Full project lifecycle with budget and milestone management
- **Budget** — Plans and expenditure tracking per institution
- **Reports & Analytics** — Charts, trend analysis, institution comparison
- **Documents** — Central repository for official files
- **API Integrations** — API key management for external system connectivity
- **Helpdesk** — Public support ticket system (no login required for submission)
- **Audit Trail** — Full logging of all data changes

---

## API Documentation

All API endpoints are prefixed with `/api/`.

| Module | Base Path |
|--------|-----------|
| Authentication | `/api/auth` |
| Users | `/api/users` |
| Institutions | `/api/institutions` |
| Results Framework | `/api/framework` |
| Indicators | `/api/indicators` |
| Data Entry | `/api/data-entry` |
| Workplan | `/api/workplan` |
| Projects | `/api/projects` |
| Budget | `/api/budget` |
| Reports | `/api/reports` |
| Analytics | `/api/analytics` |
| Documents | `/api/documents` |
| Helpdesk | `/api/helpdesk` |
| Notifications | `/api/notifications` |
| Dashboard | `/api/dashboard` |
| Integrations | `/api/integrations` |

---

## Database Schema

The database uses **PostgreSQL** managed through **Prisma ORM**.

```bash
# View schema
cat backend/prisma/schema.prisma

# Open Prisma Studio (visual DB browser)
cd backend
npx prisma studio
```

To reset and reseed the database:
```bash
cd backend
node prisma/clear.js    # wipes all data
npm run db:seed         # re-seeds demo data
```

---

## Development Guidelines

### Branch naming
```
feature/short-description     # new features
fix/short-description         # bug fixes
improvement/short-description # enhancements
```

### Commit message format
```
feat: add indicator comparison chart
fix: correct budget calculation for Q4
improve: optimize dashboard query performance
```

### Adding a new module

1. Create `backend/src/modules/yourmodule/`
2. Add `yourmodule.routes.js` and `yourmodule.controller.js`
3. Register in `backend/src/app.js`: `app.use('/api/yourmodule', require(...))`
4. Add Prisma models to `schema.prisma` and run `npx prisma migrate dev`
5. Add API methods to `frontend/src/api/index.js`
6. Create page in `frontend/src/pages/yourmodule/YourPage.jsx`
7. Add route in `frontend/src/App.jsx`
8. Add nav item in `frontend/src/components/layout/AppLayout.jsx`

---

## Environment Variables Reference

See `backend/.env.example` for the full list with descriptions.

---

## Known Limitations / Future Improvements

- [ ] AI-powered analytics assistant (Gemini API / Ollama integration planned)
- [ ] Email notifications (SMTP config ready, needs mail server)
- [ ] Mobile app (React Native)
- [ ] Public government server deployment with trusted SSL certificate
- [ ] Offline data entry support
- [ ] Bulk data import via Excel/CSV

---

## Support

For technical issues, contact the ICT Unit, Ministry of Industry and Trade.
For system usage questions, refer to the [User Manual](./USER_MANUAL.md).

---

*MIT M&E System v1.0 — Ministry of Industry and Trade, Tanzania*
