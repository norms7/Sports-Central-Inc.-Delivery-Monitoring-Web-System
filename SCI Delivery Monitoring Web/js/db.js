// ============================================================
// db.js — Supabase data layer
// Replaces every localStorage call for delivery reports.
// All other JS files call these functions instead of
// touching localStorage directly.
//
// SETUP: Replace the two constants below with your
//        actual Supabase project values.
// ============================================================

const SUPABASE_URL    = 'https://tqimeobgkhfzjrrzfkyk.supabase.co';      // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaW1lb2Jna2hmempycnpma3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjAzNjQsImV4cCI6MjA5NzEzNjM2NH0.x9xmUCXz--_Nlp-ZsUDkPOU1FD-rvC_0m5KBCxnnm0E'; // public anon key from Supabase dashboard

// ── Base fetch wrapper ─────────────────────────────────────
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

// ── Shape converters ───────────────────────────────────────
// DB rows use snake_case; JS uses camelCase.
// These functions translate both ways so zero other files change.

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

// ── MONTH name → number ────────────────────────────────────
function _monthNum(monthName) {
  return MONTHS.indexOf(monthName) + 1; // 1-based
}

// ── PUBLIC API ─────────────────────────────────────────────

/**
 * Get all reports for a specific year + month.
 * Returns array of report objects (same shape as old localStorage).
 */
async function dbGetMonthReports(year, month) {
  const monthNum = String(_monthNum(month)).padStart(2, '0');
  const from = `${year}-${monthNum}-01`;
  // Last day of month
  const lastDay = new Date(year, _monthNum(month), 0).getDate();
  const to   = `${year}-${monthNum}-${lastDay}`;

  // 1. Fetch reports in date range
  const rows = await _sbFetch(
    `reports?delivery_date=gte.${from}&delivery_date=lte.${to}&order=delivery_date.asc`
  );
  if (!rows || rows.length === 0) return [];

  // 2. Fetch all invoices for those report ids in one query
  const ids = rows.map(r => r.id).join(',');
  const invoiceRows = await _sbFetch(
    `sales_invoices?report_id=in.(${ids})&order=id.asc`
  );

  // 3. Group invoices by report_id
  const invoiceMap = {};
  (invoiceRows || []).forEach(si => {
    if (!invoiceMap[si.report_id]) invoiceMap[si.report_id] = [];
    invoiceMap[si.report_id].push(si);
  });

  return rows.map(r => _reportFromDB(r, invoiceMap[r.id] || []));
}

/**
 * Count reports for a year + month (used by month-grid cards).
 */
async function dbCountMonthReports(year, month) {
  const monthNum = String(_monthNum(month)).padStart(2, '0');
  const from = `${year}-${monthNum}-01`;
  const lastDay = new Date(year, _monthNum(month), 0).getDate();
  const to   = `${year}-${monthNum}-${lastDay}`;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reports?delivery_date=gte.${from}&delivery_date=lte.${to}&select=id`,
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

/**
 * Save a new report + its invoices (insert).
 */
async function dbSaveReport(report) {
  // Insert report row
  await _sbFetch('reports', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(_reportToDB(report))
  });

  // Insert invoice rows
  const invoices = _invoicesToDB(report.id, report.salesInvoices);
  if (invoices.length > 0) {
    await _sbFetch('sales_invoices', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(invoices)
    });
  }
}

/**
 * Update an existing report (put new invoices, delete old ones).
 */
async function dbUpdateReport(report) {
  // Update report row
  await _sbFetch(`reports?id=eq.${report.id}`, {
    method:  'PATCH',
    prefer:  'return=minimal',
    body: JSON.stringify(_reportToDB(report))
  });

  // Delete old invoices then reinsert
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

/**
 * Delete a report (cascades to sales_invoices via FK).
 */
async function dbDeleteReport(reportId) {
  await _sbFetch(`reports?id=eq.${reportId}`, {
    method: 'DELETE',
    prefer: 'return=minimal'
  });
}

/**
 * Get all distinct years that have reports.
 */
async function dbGetYears() {
  const rows = await _sbFetch('reports?select=delivery_date&order=delivery_date.desc');
  const years = new Set([new Date().getFullYear()]);
  (rows || []).forEach(r => years.add(new Date(r.delivery_date).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Get all reports for an entire year (for annual analytics).
 */
async function dbGetYearReports(year) {
  const from = `${year}-01-01`;
  const to   = `${year}-12-31`;

  const rows = await _sbFetch(
    `reports?delivery_date=gte.${from}&delivery_date=lte.${to}&order=delivery_date.asc`
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

// ── UI loading state helper ─────────────────────────────────
function dbShowLoading(elementId, message = 'Loading...') {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="db-loading"><div class="db-spinner"></div>${message}</div>`;
}

function dbShowError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="db-error">⚠️ ${message}</div>`;
}
