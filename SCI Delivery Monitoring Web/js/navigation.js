// Navigation: page-switching, brand filter, category toggles

// ── Cross-page navigation ──────────────────────────────────────────────────
// These are used from form pages to go back to dashboard
function showNewReport() {
  window.location.href = 'direct.html';
}

function showArchives() {
  window.location.href = 'archives.html';
}

// ── Within archives.html: section switching ────────────────────────────────
function showMonthView(month) {
  currentMonth = month;
  currentYear  = getSelectedYear();
  selectedBrandFilter = 'All';
  searchQuery  = '';
  dateFilter   = '';

  _hideAll(['archivesPage', 'editReportPage', 'analyticsPage', 'annualAnalyticsPage']);
  document.getElementById('monthViewPage')?.classList.remove('hidden');

  document.getElementById('monthTitle').textContent    = `📦 ${month} ${currentYear} Reports`;
  document.getElementById('monthSubtitle').textContent = `Viewing deliveries recorded for ${month}, ${currentYear}`;

  document.querySelectorAll('.brand-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.brand-chip.all')?.classList.add('active');

  const si = document.getElementById('searchInput');
  if (si) si.value = '';
  const sh = document.getElementById('searchHint');
  if (sh) sh.textContent = '';

  const di = document.getElementById('dateFilterInput');
  if (di) di.value = '';
  const dh = document.getElementById('dateFilterHint');
  if (dh) dh.textContent = '';

  loadMonthReports(month, currentYear);
}

// Utility: hide a list of page divs by id (safe – skips missing ids)
function _hideAll(ids) {
  ids.forEach(id => document.getElementById(id)?.classList.add('hidden'));
}

// ── Brand Filter ───────────────────────────────────────────────────────────
function filterByBrand(brand) {
  selectedBrandFilter = brand;
  document.querySelectorAll('.brand-chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  renderMonthReportsTable();
}

// ── Category toggles ───────────────────────────────────────────────────────
function toggleOtherCategory() {
  const val = document.getElementById('category').value;
  const field = document.getElementById('otherCategoryField');
  const input = document.getElementById('otherCategory');
  if (val === 'Others') {
    field?.classList.remove('hidden');
    if (input) input.required = true;
  } else {
    field?.classList.add('hidden');
    if (input) { input.required = false; input.value = ''; }
  }
}

function toggleEditOtherCategory() {
  const val = document.getElementById('editCategory').value;
  const field = document.getElementById('editOtherCategoryField');
  const input = document.getElementById('editOtherCategory');
  if (val === 'Others') {
    field?.classList.remove('hidden');
    if (input) input.required = true;
  } else {
    field?.classList.add('hidden');
    if (input) { input.required = false; input.value = ''; }
  }
}
