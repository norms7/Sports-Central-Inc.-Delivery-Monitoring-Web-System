# Supabase + Vercel Setup Guide
## Step-by-step to go live

---

## 1. Create Supabase Project
1. Go to https://supabase.com → Sign up (free)
2. Click **"New Project"**
3. Name it: `sci-ds-sanlazaro` (or anything you want)
4. Set a strong database password → **save it somewhere safe** DSsci_68988
5. Choose region: **Southeast Asia (Singapore)** — closest to Philippines
6. Click **Create Project** — wait ~2 minutes

---

## 2. Run the Database Schema
1. In Supabase dashboard → **SQL Editor** → **New Query**
2. Open the file `supabase/schema.sql` from this project
3. Paste the entire contents into the editor
4. Click **Run** (green button)
5. You should see: `Schema created successfully ✅`

---

## 3. Get Your API Keys
1. In Supabase dashboard → **Project Settings** → **API**
2. Copy these two values:
   - **Project URL** → looks like `https://abcxyzabc.supabase.co` https://tqimeobgkhfzjrrzfkyk.supabase.co  
   - **anon / public** key → long string starting with `eyJ...`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaW1lb2Jna2hmempycnpma3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjAzNjQsImV4cCI6MjA5NzEzNjM2NH0.x9xmUCXz--_Nlp-ZsUDkPOU1FD-rvC_0m5KBCxnnm0E
---

## 4. Put Your Keys in db.js
Open `js/db.js` and replace the two placeholders at the top:

```js
const SUPABASE_URL     = 'https://YOUR-PROJECT.supabase.co';   // ← paste here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5...';      // ← paste here
```

Save the file.

---

## 5. Deploy Frontend to Vercel
1. Go to https://vercel.com → Sign up with GitHub (free)
2. Push your project folder to a **GitHub repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/delivery-web.git
   git push -u origin main
   ```
3. In Vercel → **Add New Project** → Import your GitHub repo
4. **Framework Preset**: Other (static site)
5. **Root Directory**: leave blank (or set to `/`)
6. Click **Deploy**
7. Vercel gives you a live URL like `https://delivery-web-abc.vercel.app`

---

## 6. Test It
1. Open your Vercel URL
2. Login with your credentials
3. Create a test delivery report
4. Go to Supabase → **Table Editor** → `reports` — you should see the row

---

## Architecture Summary

```
Browser (Vercel)
    │
    │  HTTPS fetch calls
    ▼
Supabase REST API
    │
    │  SQL queries
    ▼
PostgreSQL Database
  ├── reports
  ├── sales_invoices
  ├── supplies_reports
  └── supplies_items
```

## Costs
- **Supabase Free**: 500MB DB, 2GB bandwidth, unlimited API calls ✅
- **Vercel Free**: 100GB bandwidth, unlimited deploys ✅
- **Total monthly cost: ₱0** (until you exceed free limits, which takes a long time for an internal app)

---

## CORS Note
Supabase auto-allows requests from any origin on the anon key.
No CORS configuration needed.

## Security Note
The anon key is safe to expose in frontend code — it only has
the permissions defined by your RLS policies. Since RLS is disabled
(single-user internal app), your only security layer is the login
password in `core.js`. When you're ready to add per-user security,
enable RLS and add policies in Supabase.
