# BuildPro — Construction Material Management System

A full-stack web application for construction material suppliers. Customer portal, admin dashboard, AI chatbot, inventory management, analytics, and more.

---

## 🗂 Project Structure

```
buildpro/
├── backend/          # Node.js + Express API
├── frontend/         # Next.js + TypeScript + Tailwind
└── docs/             # Deployment guides
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/buildpro.git
cd buildpro

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DB credentials and secrets

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your API URL
```

### 3. Setup Database

```bash
cd backend
npm run db:migrate
npm run db:seed
```

### 4. Run Dev Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open http://localhost:3000

**Admin login:** admin@buildpro.com / Admin@123

---

## 🚀 Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full step-by-step guide.

- Frontend → Vercel
- Backend → Railway or Render
- Database → Railway PostgreSQL or Supabase

---

## 🔑 Default Credentials

| Role  | Email                 | Password   |
|-------|-----------------------|------------|
| Admin | admin@buildpro.com    | Admin@123  |

---

## 📦 Tech Stack

| Layer      | Tech                              |
|------------|-----------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind  |
| Backend    | Node.js, Express, TypeScript      |
| Database   | PostgreSQL                        |
| Auth       | JWT + bcrypt                      |
| Charts     | Recharts                          |
| AI Chat    | Anthropic Claude API              |
| Email      | Nodemailer                        |
| PDF        | Puppeteer                         |
| Excel      | ExcelJS                           |
