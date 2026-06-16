-- ============================================================
-- SCI DS San Lazaro - 6898 | Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── DELIVERY REPORTS ──────────────────────────────────────
create table if not exists reports (
  id          bigint primary key,          -- keep numeric id (same as Date.now())
  type        text not null check (type in ('direct','transfer','pullout')),
  brand       text not null,
  total_boxes int  not null default 0,
  delivery_date date not null,
  category    text not null,
  remarks     text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

-- ── SALES INVOICES (child of reports) ─────────────────────
create table if not exists sales_invoices (
  id          bigserial primary key,
  report_id   bigint not null references reports(id) on delete cascade,
  po_number   text default '',
  si_number   text default '',
  tr_number   text default '',
  dr_number   text default '',
  si_units    int  not null default 0,
  actual_units int not null default 0,
  retail_price numeric(12,2) default 0
);

-- ── SUPPLIES REPORTS ──────────────────────────────────────
create table if not exists supplies_reports (
  id          bigint primary key,
  brand       text not null,
  delivery_date date not null,
  category    text not null,
  supplier    text default '',
  remarks     text default '',
  created_at  timestamptz default now()
);

-- ── SUPPLIES ITEMS (child of supplies_reports) ─────────────
create table if not exists supplies_items (
  id            bigserial primary key,
  report_id     bigint not null references supplies_reports(id) on delete cascade,
  item_name     text not null,
  quantity      int  not null default 0,
  unit          text default '',
  retail_price  numeric(12,2) default 0
);

-- ── INDEXES ───────────────────────────────────────────────
create index if not exists idx_reports_delivery_date on reports(delivery_date);
create index if not exists idx_reports_brand         on reports(brand);
create index if not exists idx_reports_type          on reports(type);
create index if not exists idx_si_report_id          on sales_invoices(report_id);
create index if not exists idx_supplies_delivery_date on supplies_reports(delivery_date);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
-- We use anon key with RLS disabled for simplicity (single-user internal app).
-- When you're ready for multi-user, enable RLS and add policies here.
alter table reports          disable row level security;
alter table sales_invoices   disable row level security;
alter table supplies_reports disable row level security;
alter table supplies_items   disable row level security;

-- ── VIEWS (used by analytics for fast monthly aggregation) ─
create or replace view monthly_summary as
select
  extract(year  from r.delivery_date)::int as year,
  to_char(r.delivery_date, 'Month')        as month,
  extract(month from r.delivery_date)::int as month_num,
  count(distinct r.id)                     as deliveries,
  coalesce(sum(si.si_units), 0)            as si_units,
  coalesce(sum(si.actual_units), 0)        as actual_units,
  coalesce(sum(si.actual_units - si.si_units), 0) as variance,
  coalesce(sum(si.retail_price), 0)        as retail_value
from reports r
left join sales_invoices si on si.report_id = r.id
group by 1, 2, 3
order by 1, 3;

select 'Schema created successfully ✅' as status;
