# BuildPro — Step-by-Step Deployment Guide

---

## 📋 Overview

| Service   | Platform         | URL Format                          |
|-----------|------------------|-------------------------------------|
| Frontend  | Vercel           | https://buildpro.vercel.app         |
| Backend   | Railway / Render | https://buildpro-api.railway.app    |
| Database  | Railway / Supabase | Managed PostgreSQL                |

---

## STEP 1 — Prepare Your Local Environment

### 1.1 Install Prerequisites
```bash
# Node.js 18+ (https://nodejs.org)
node -v   # Should show v18 or higher
npm -v    # Should show 9+

# PostgreSQL (https://postgresql.org/download)
psql -V   # Should show 14+

# Git
git -V
```

### 1.2 Clone & Setup
```bash
# Unzip the downloaded buildpro.zip
unzip buildpro.zip
cd buildpro

# Initialize git repo
git init
git add .
git commit -m "Initial commit — BuildPro"
```

---

## STEP 2 — Push to GitHub

### 2.1 Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `buildpro`
3. Set to **Public** or **Private**
4. Click **Create repository**

### 2.2 Push Your Code
```bash
git remote add origin https://github.com/YOUR_USERNAME/buildpro.git
git branch -M main
git push -u origin main
```

---

## STEP 3 — Set Up PostgreSQL Database

### Option A: Railway (Recommended — Free Tier)
1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project** → **Provision PostgreSQL**
3. Go to the PostgreSQL service → **Variables** tab
4. Copy the `DATABASE_URL` (looks like `postgresql://user:pass@host:port/db`)

### Option B: Supabase (Free Tier — 500MB)
1. Go to https://supabase.com → Sign up
2. **New Project** → Set a strong password
3. Go to **Settings → Database → Connection String → URI**
4. Copy the connection string

### Option C: Local PostgreSQL (Development Only)
```bash
createdb buildpro
# DATABASE_URL = postgresql://postgres:yourpassword@localhost:5432/buildpro
```

---

## STEP 4 — Deploy Backend to Railway

### 4.1 Deploy Backend
1. Go to https://railway.app → **New Project**
2. Click **Deploy from GitHub repo** → Select your `buildpro` repo
3. Railway auto-detects the Node.js app
4. Set the **Root Directory** to `backend`
5. Set **Start Command**: `npm start`
6. Set **Build Command**: `npm run build`

### 4.2 Set Backend Environment Variables
In Railway → Your backend service → **Variables** tab, add:

```
PORT=5000
NODE_ENV=production
DATABASE_URL=<paste your PostgreSQL URL from Step 3>
JWT_SECRET=<generate a random 64-char string — use: openssl rand -hex 32>
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=BuildPro <your@gmail.com>
ANTHROPIC_API_KEY=<your Anthropic API key from console.anthropic.com>
FRONTEND_URL=https://your-buildpro.vercel.app
WHATSAPP_NUMBER=+1234567890
```

### 4.3 Get Gmail App Password (for Email)
1. Go to https://myaccount.google.com → Security
2. Enable **2-Step Verification**
3. Go to **App Passwords** → Select **Mail** → **Generate**
4. Copy the 16-character password → use as `EMAIL_PASS`

### 4.4 Run Database Migration & Seed
After deployment, open Railway's terminal or use their CLI:
```bash
npm run db:seed
```
Or connect directly to the database:
```bash
DATABASE_URL="<your_db_url>" npm run db:seed
```

**After seed, admin credentials are:**
- Email: `admin@buildpro.com`
- Password: `Admin@123`

---

## STEP 5 — Deploy Frontend to Vercel

### 5.1 Import to Vercel
1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New → Project**
3. Import your `buildpro` repository
4. Set **Root Directory** to `frontend`
5. Framework: **Next.js** (auto-detected)

### 5.2 Set Frontend Environment Variables
In Vercel → Project → **Settings → Environment Variables**, add:

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_WHATSAPP_NUMBER=+1234567890
```

### 5.3 Deploy
Click **Deploy** → Wait 2–3 minutes → Your site is live!

### 5.4 Update Backend CORS
After Vercel deployment, copy your Vercel URL (e.g. `https://buildpro-xyz.vercel.app`)
Go back to Railway backend → Variables → update:
```
FRONTEND_URL=https://buildpro-xyz.vercel.app
```
Then redeploy backend.

---

## STEP 6 — Alternative: Deploy Backend to Render

If Railway doesn't work, use Render (also free tier):

1. Go to https://render.com → Sign up
2. **New → Web Service** → Connect GitHub → Select `buildpro`
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
4. Add all environment variables (same as Step 4.2)
5. Click **Create Web Service**

Note: Free tier on Render sleeps after 15 min inactivity (cold start ~30s).

---

## STEP 7 — Custom Domain (Optional)

### Vercel (Frontend)
1. Vercel Dashboard → Your project → **Settings → Domains**
2. Add your domain (e.g. `buildpro.com`)
3. Update your DNS records as shown by Vercel

### Railway (Backend)
1. Railway → Your backend service → **Settings → Domains**
2. Add a custom domain or use the Railway-provided `.railway.app` domain

---

## STEP 8 — Get API Keys

### Anthropic API Key (for AI Chatbot)
1. Go to https://console.anthropic.com
2. Sign up / Sign in
3. Go to **API Keys** → **Create Key**
4. Copy the key → Add to backend `ANTHROPIC_API_KEY`

*Note: You get $5 free credits on signup.*

---

## STEP 9 — Test Your Deployment

### Checklist
```
✅ Customer site loads at your Vercel URL
✅ Products are displayed (from database)
✅ Order form submits successfully
✅ Appointment booking works
✅ AI Chatbot responds (check Anthropic key)
✅ Admin login works (admin@buildpro.com / Admin@123)
✅ Dashboard shows stats
✅ Orders appear in admin
✅ Inventory levels show correctly
✅ Excel report downloads
✅ Email confirmation received on order submit
```

### Test API Health
```bash
curl https://your-backend.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## STEP 10 — Change Admin Password

**IMPORTANT: Do this immediately after first login!**

1. Log into admin panel
2. The backend has a `/api/auth/change-password` endpoint
3. Or update directly in database:
```sql
-- Connect to your database, then:
UPDATE users SET password = '$2b$12$...' WHERE email = 'admin@buildpro.com';
-- (hash generated with bcrypt)
```

---

## 🔧 Local Development Reference

```bash
# Terminal 1 — Start backend
cd backend
npm install
cp .env.example .env   # Edit with your values
npm run db:seed        # Setup database with sample data
npm run dev            # Runs on http://localhost:5000

# Terminal 2 — Start frontend
cd frontend
npm install
cp .env.example .env.local   # Edit with API URL
npm run dev            # Runs on http://localhost:3000
```

---

## 🚨 Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Update `FRONTEND_URL` in backend env to match exact Vercel URL |
| DB connection failed | Check `DATABASE_URL` format and SSL settings |
| Chatbot not responding | Verify `ANTHROPIC_API_KEY` is set and has credits |
| Email not sending | Check Gmail App Password, not regular password |
| Build fails on Vercel | Ensure `Root Directory` is set to `frontend` |
| 401 on admin routes | Check JWT_SECRET is set and token is valid |

---

## 📞 Support

- Anthropic API: https://console.anthropic.com
- Railway: https://railway.app/help
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
