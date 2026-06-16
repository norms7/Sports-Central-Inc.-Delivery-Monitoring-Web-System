// ============================================================
// db.js — Supabase data layer (multi-branch aware)
// All queries are scoped to the current user's branch_id.
// ============================================================

const SUPABASE_URL     = 'https://tqimeobgkhfzjrrzfkyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaW1lb2Jna2hmempycnpma3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjAzNjQsImV4cCI6MjA5NzEzNjM2NH0.x9xmUCXz--_Nlp-ZsUDkPOU1FD-rvC_0m5KBCxnnm0E';

// ── Base fetch wrapper ──────────────────────────────────────
async function _sbFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        options.prefer || 'return=representation',
      ...options.headers
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Branch ID helper ────────────────────────────────────────
function _branchId() {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user.branchId;
}

// ── Shape converters ────────────────────────────────────────
function _reportFromDB(row, invoices = []) {
  return {
    id:           row.id,
    type:         row.type,
    brand:        row.brand,
    totalBoxes:   row.total_boxes,
    deliveryDate: row.delivery_date,
    category:     row.category,
    remarks:      row.remarks || '',
    createdAt:    row.created_at,
    updatedAt:    row.updated_at || null,
    salesInvoices: invoices.map(si => ({
      poNumber:    si.po_number || '',
      siNumber:    si.si_number || '',
      trNumber:    si.tr_number || '',
      drNumber:    si.dr_number || '',
      siUnits:     si.si_units,
      actualUnits: si.actual_units,
      retailPrice: parseFloat(si.retail_price)
    }))
  };
}

function _reportToDB(report) {
  return {
    id:            report.id,
    branch_id:     _branchId(),
    type:          report.type,
    brand:         report.brand,
    total_boxes:   report.totalBoxes,
    delivery_date: report.deliveryDate,
    category:      report.category,
    remarks:       report.remarks || '',
    created_at:    report.createdAt,
    updated_at:    report.updatedAt || null
  };
}

function _invoicesToDB(reportId, salesInvoices) {
  return salesInvoices.map(si => ({
    report_id:    reportId,
    po_number:    si.poNumber    || '',
    si_number:    si.siNumber    || '',
    tr_number:    si.trNumber    || '',
    dr_number:    si.drNumber    || '',
    si_units:     si.siUnits,
    actual_units: si.actualUnits,
    retail_price: si.retailPrice
  }));
}

function _monthNum(monthName) {
  return MONTHS.indexOf(monthName) + 1;
}

// ── PUBLIC API ──────────────────────────────────────────────

async function dbGetMonthReports(year, month) {
  const bid = _branchId();
  const monthNum = String(_monthNum(month)).padStart(2, '0');
  const from = `${year}-${monthNum}-01`;
  const lastDay = new Date(year, _monthNum(month), 0).getDate();
  const to   = `${year}-${monthNum}-${lastDay}`;

  const rows = await _sbFetch(
    `reports?branch_id=eq.${bid}&delivery_date=gte.${from}&delivery_date=lte.${to}&order=delivery_date.asc`
  );
  if (!rows || rows.length === 0) return [];

  const ids = rows.map(r => r.id).join(',');
  const invoiceRows = await _sbFetch(
    `sales_invoices?report_id=in.(${ids})&order=id.asc`
  );

  const invoiceMap = {};
  (invoiceRows || []).forEach(si => {
    if (!invoiceMap[si.report_id]) invoiceMap[si.report_id] = [];
    invoiceMap[si.report_id].push(si);
  });

  return rows.map(r => _reportFromDB(r, invoiceMap[r.id] || []));
}

async function dbCountMonthReports(year, month) {
  const bid = _branchId();
  const monthNum = String(_monthNum(month)).padStart(2, '0');
  const from = `${year}-${monthNum}-01`;
  const lastDay = new Date(year, _monthNum(month), 0).getDate();
  const to   = `${year}-${monthNum}-${lastDay}`;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reports?branch_id=eq.${bid}&delivery_date=gte.${from}&delivery_date=lte.${to}&select=id`,
    {
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer':        'count=exact',
        'Range-Unit':    'items',
        'Range':         '0-0'
      }
    }
  );
  const range = res.headers.get('Content-Range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

async function dbSaveReport(report) {
  await _sbFetch('reports', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(_reportToDB(report))
  });

  const invoices = _invoicesToDB(report.id, report.salesInvoices);
  if (invoices.length > 0) {
    await _sbFetch('sales_invoices', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(invoices)
    });
  }
}

async function dbUpdateReport(report) {
  const bid = _branchId();
  await _sbFetch(`reports?id=eq.${report.id}&branch_id=eq.${bid}`, {
    method:  'PATCH',
    prefer:  'return=minimal',
    body: JSON.stringify(_reportToDB(report))
  });

  await _sbFetch(`sales_invoices?report_id=eq.${report.id}`, {
    method: 'DELETE',
    prefer: 'return=minimal'
  });

  const invoices = _invoicesToDB(report.id, report.salesInvoices);
  if (invoices.length > 0) {
    await _sbFetch('sales_invoices', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(invoices)
    });
  }
}

async function dbDeleteReport(reportId) {
  const bid = _branchId();
  await _sbFetch(`reports?id=eq.${reportId}&branch_id=eq.${bid}`, {
    method: 'DELETE',
    prefer: 'return=minimal'
  });
}

async function dbGetYears() {
  const bid = _branchId();
  const rows = await _sbFetch(`reports?branch_id=eq.${bid}&select=delivery_date&order=delivery_date.desc`);
  const years = new Set([new Date().getFullYear()]);
  (rows || []).forEach(r => years.add(new Date(r.delivery_date).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

async function dbGetYearReports(year) {
  const bid = _branchId();
  const from = `${year}-01-01`;
  const to   = `${year}-12-31`;

  const rows = await _sbFetch(
    `reports?branch_id=eq.${bid}&delivery_date=gte.${from}&delivery_date=lte.${to}&order=delivery_date.asc`
  );
  if (!rows || rows.length === 0) return [];

  const ids = rows.map(r => r.id).join(',');
  const invoiceRows = await _sbFetch(
    `sales_invoices?report_id=in.(${ids})&order=id.asc`
  );

  const invoiceMap = {};
  (invoiceRows || []).forEach(si => {
    if (!invoiceMap[si.report_id]) invoiceMap[si.report_id] = [];
    invoiceMap[si.report_id].push(si);
  });

  return rows.map(r => _reportFromDB(r, invoiceMap[r.id] || []));
}

// ── Supplies (also branch-scoped) ──────────────────────────

function _supplyFromDB(row, items = []) {
  return {
    id:           row.id,
    brand:        row.brand,
    deliveryDate: row.delivery_date,
    category:     row.category,
    supplier:     row.supplier || '',
    remarks:      row.remarks || '',
    createdAt:    row.created_at,
    items: items.map(i => ({
      itemName:    i.item_name,
      quantity:    i.quantity,
      unit:        i.unit || '',
      retailPrice: parseFloat(i.retail_price)
    }))
  };
}

function _supplyToDB(report) {
  return {
    id:            report.id,
    branch_id:     _branchId(),
    brand:         report.brand,
    delivery_date: report.deliveryDate,
    category:      report.category,
    supplier:      report.supplier || '',
    remarks:       report.remarks || '',
    created_at:    report.createdAt
  };
}

// ── UI helpers ──────────────────────────────────────────────
function dbShowLoading(elementId, message = 'Loading...') {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="db-loading"><div class="db-spinner"></div>${message}</div>`;
}

function dbShowError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="db-error">⚠️ ${message}</div>`;
}