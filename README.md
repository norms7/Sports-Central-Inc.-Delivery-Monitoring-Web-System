# SCI DS San Lazaro - 6898
## Delivery Management & Analytics System

A web-based internal tool for managing and tracking daily product deliveries
for Sports Central San Lazaro (Branch 6898). Built for store operations staff
to record, monitor, and analyze delivery data across brands in real time.

---

### Features
- 📦 Delivery report forms — Direct Delivery, Transfer Receiving, Pullout Receiving
- 🧾 Multi-SI / Multi-DR entry per report with variance tracking
- 📁 Monthly Archives — browse, search, and filter records by brand, date, or SI number
- 📊 Monthly Analytics — charts for volume, brand share, category mix, delivery types, and variance detail
- 📅 Annual Analytics — full-year insights with KPI banner, 8 charts, monthly summary table, and brand leaderboard
- 📥 Excel Export — monthly and annual reports with per-sheet month breakdown
- ✏️ Password-protected edit and delete on existing records
- 🌙 Dark mode support

---

### Tech Stack
| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Vanilla HTML / CSS / JavaScript   |
| Database  | PostgreSQL via Supabase            |
| API       | Supabase REST API (auto-generated) |
| Charts    | Chart.js                          |
| Export    | SheetJS (xlsx)                    |
| Hosting   | Vercel (frontend)                 |

---

### Project Structure
delivery-web/
├── pages/          # HTML pages (login, dashboard, forms, archives)
├── js/             # JavaScript modules
│   ├── db.js       # Supabase data layer (all DB calls)
│   ├── core.js     # Constants, globals, theme, helpers
│   ├── auth.js     # Login, logout, routing
│   ├── archives.js # Month grid, table, search, export
│   ├── analytics.js          # Monthly charts and variance table
│   ├── annual-analytics.js   # Annual charts, KPIs, export
│   ├── direct-report.js      # Direct delivery form
│   ├── transfer-report.js    # Transfer receiving form
│   ├── pullout-report.js     # Pullout receiving form
│   └── edit-report.js        # Password-gated edit flow
├── css/            # Modular stylesheets
├── images/         # Logo and assets
└── supabase/       # schema.sql + setup guide

---

### Setup
See supabase/SETUP_GUIDE.md for full instructions.
Requires a free Supabase account and a free Vercel account.