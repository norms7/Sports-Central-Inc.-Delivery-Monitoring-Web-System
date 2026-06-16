// Archives: month grid, reports table, search, date filter, view, export

// ── Month Grid ────────────────────────────────────────────
async function loadMonthGrid() {
  const grid = document.getElementById('monthGrid');
  const year = getSelectedYear();
  grid.innerHTML = '<div class="db-loading"><div class="db-spinner"></div>Loading...</div>';

  try {
    // Fetch counts for all 12 months in parallel
    const counts = await Promise.all(
      MONTHS.map(month => dbCountMonthReports(year, month))
    );

    let html = '';
    MONTHS.forEach((month, i) => {
      const count = counts[i];
      html += `
        <div class="month-card ${count > 0 ? 'has-data' : ''}" onclick="showMonthView('${month}')">
          <strong>${month}</strong>
          <div class="count">${count}</div>
          <div class="sub">records in ${year}</div>
        </div>`;
    });
    grid.innerHTML = html;
  } catch(e) {
    grid.innerHTML = `<div class="db-error">⚠️ Failed to load archives: ${e.message}</div>`;
  }
}

// ── Month Reports Table ───────────────────────────────────
async function loadMonthReports(month, year) {
  const table = document.getElementById('monthRecordsTable');
  dbShowLoading('monthRecordsTable', `Loading ${month} ${year}...`);
  try {
    allMonthReports = await dbGetMonthReports(year, month);
    renderMonthReportsTable();
  } catch(e) {
    dbShowError('monthRecordsTable', `Failed to load reports: ${e.message}`);
  }
}

function renderMonthReportsTable() {
  const table     = document.getElementById('monthRecordsTable');
  const searchHint = document.getElementById('searchHint');
  const dateHint   = document.getElementById('dateFilterHint');

  let filtered = allMonthReports;

  if (selectedBrandFilter !== 'All')
    filtered = filtered.filter(r => r.brand.toLowerCase() === selectedBrandFilter.toLowerCase());

  if (dateFilter)
    filtered = filtered.filter(r => r.deliveryDate === dateFilter);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(r =>
      r.salesInvoices.some(si =>
        (si.poNumber||'').toLowerCase().includes(q) ||
        (si.siNumber||'').toLowerCase().includes(q) ||
        (si.trNumber||'').toLowerCase().includes(q) ||
        (si.drNumber||'').toLowerCase().includes(q)
      )
    );
  }

  // Search hint
  if (searchQuery.trim()) {
    searchHint.textContent = `Found ${filtered.length} report${filtered.length!==1?'s':''} matching "${searchQuery}"`;
    searchHint.style.color = filtered.length > 0 ? '#16a34a' : '#dc2626';
  } else { searchHint.textContent = ''; }

  // Date hint
  if (dateHint) {
    if (dateFilter) {
      const label = new Date(dateFilter+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
      dateHint.textContent = `Showing deliveries for ${label}`;
      dateHint.style.color = filtered.length > 0 ? '#16a34a' : '#dc2626';
    } else { dateHint.textContent = ''; }
  }

  if (filtered.length === 0) {
    let msg = '';
    if (searchQuery.trim())  msg = `No reports matching <strong>"${searchQuery}"</strong>.`;
    else if (dateFilter)     msg = `No deliveries on <strong>${new Date(dateFilter+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong>.`;
    else if (selectedBrandFilter !== 'All') msg = `No reports for <strong>${selectedBrandFilter}</strong> in <strong>${currentMonth} ${currentYear}</strong>.`;
    else msg = `No reports for <strong>${currentMonth} ${currentYear}</strong>.`;
    table.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }

  // Flatten SIs → one row per SI
  const flatRows = [];
  filtered.forEach(report => {
    report.salesInvoices.forEach((si, siIndex) => flatRows.push({ report, si, siIndex }));
  });

  let totalSI=0, totalActual=0, totalVariance=0, totalRetail=0;
  const brandCounts = {};
  flatRows.forEach(({report,si}) => {
    brandCounts[report.brand] = (brandCounts[report.brand]||0) + 1;
    totalSI       += si.siUnits;
    totalActual   += si.actualUnits;
    totalVariance += (si.actualUnits - si.siUnits);
    totalRetail   += Number(si.retailPrice||0);
  });

  const hl = text => {
    if (!searchQuery.trim()) return text;
    return String(text).replace(new RegExp(`(${searchQuery})`,'gi'),'<span class="search-highlight">$1</span>');
  };

  let html = `<div class="table-scroll-wrapper"><table>
    <thead><tr>
      <th>#</th><th>Date</th><th>PO/TR No.</th><th>Brand</th>
      <th>SI/DR No.</th><th>SI Units</th><th>Actual</th>
      <th>Variance</th><th>Retail Price</th><th>Category</th><th>Actions</th>
    </tr></thead><tbody>`;

  flatRows.forEach(({report,si,siIndex},i) => {
    const poTr  = si.trNumber || (si.poNumber && si.poNumber!=='N/A' ? si.poNumber : 'N/A');
    const siDr  = si.drNumber || si.siNumber || '';
    const variance = si.actualUnits - si.siUnits;
    const vClass   = variance>0?'positive':variance<0?'negative':'';
    const badge    = report.salesInvoices.length > 1
      ? `<span class="si-index-badge">${siIndex+1}/${report.salesInvoices.length}</span>` : '';

    html += `<tr onclick="viewReport('${currentMonth}',${currentYear},${report.id})" style="cursor:pointer;">
      <td><strong>${i+1}</strong>${badge}</td>
      <td>${report.deliveryDate}</td>
      <td>${hl(poTr)}</td>
      <td>${report.brand}</td>
      <td>${hl(siDr)}</td>
      <td>${si.siUnits}</td>
      <td>${si.actualUnits}</td>
      <td class="${vClass}">${variance>0?'+':''}${variance}</td>
      <td>₱${Number(si.retailPrice||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td>${report.category}</td>
      <td onclick="event.stopPropagation();">
        <div class="table-actions">
          <button class="btn btn-warning btn-small" onclick="requestEditReport('${currentMonth}',${currentYear},${report.id})">Edit</button>
          <button class="btn btn-danger btn-small" onclick="confirmDeleteReport(${report.id},'${currentMonth}',${currentYear})">Delete</button>
        </div>
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>
  <div class="summary-section">
    <div class="summary-header"><h3>📊 Summary</h3></div>
    <div class="summary-grid">
      <div class="summary-card"><div class="summary-label">Total Records</div><div class="summary-value">${flatRows.length}</div></div>
      <div class="summary-card"><div class="summary-label">Total Units</div><div class="summary-value">${totalSI.toLocaleString()}</div></div>
      <div class="summary-card ${totalVariance>0?'positive':totalVariance<0?'negative':''}">
        <div class="summary-label">Total Variance</div>
        <div class="summary-value">${totalVariance>0?'+':''}${totalVariance.toLocaleString()}</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-label">Total Retail Price</div>
        <div class="summary-value">₱${totalRetail.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
    </div>`;

  if (selectedBrandFilter==='All' && Object.keys(brandCounts).length>1) {
    html += `<div class="brand-breakdown"><div class="breakdown-title">By Brand:</div><div class="breakdown-chips">`;
    for (let b in brandCounts) html += `<div class="breakdown-chip">${b}: <strong>${brandCounts[b]}</strong></div>`;
    html += `</div></div>`;
  }
  html += `</div>`;
  table.innerHTML = html;
}

// ── Search & Date Filter ──────────────────────────────────
function searchReports() {
  searchQuery = document.getElementById('searchInput')?.value || '';
  renderMonthReportsTable();
}
function clearSearch() {
  searchQuery = '';
  const si = document.getElementById('searchInput'); if(si) si.value='';
  const sh = document.getElementById('searchHint'); if(sh) sh.textContent='';
  renderMonthReportsTable();
}
function filterByDate() {
  dateFilter = document.getElementById('dateFilterInput')?.value || '';
  renderMonthReportsTable();
}
function clearDateFilter() {
  dateFilter = '';
  const di = document.getElementById('dateFilterInput'); if(di) di.value='';
  const dh = document.getElementById('dateFilterHint'); if(dh) dh.textContent='';
  renderMonthReportsTable();
}

// ── Delete Report ─────────────────────────────────────────
async function confirmDeleteReport(reportId, month, year) {
  if (!confirm('Delete this delivery record? This cannot be undone.')) return;
  try {
    await dbDeleteReport(reportId);
    allMonthReports = allMonthReports.filter(r => r.id !== reportId);
    renderMonthReportsTable();
    // Refresh month grid count
    await loadMonthGrid();
  } catch(e) {
    alert('Failed to delete: ' + e.message);
  }
}

// ── View Report Modal ─────────────────────────────────────
// Track current viewed report for the Edit button
let _viewingReport = null;

function viewReport(month, year, id) {
  const report = allMonthReports.find(r => r.id === id);
  if (!report) return;

  // Store context for Edit button
  _viewingReport = { month, year, id };

  // ── Type badge
  const typeLabel = report.type === 'direct' ? '🚚 Direct' : report.type === 'transfer' ? '🔄 Transfer' : '📤 Pull-out';
  const typeBadgeColor = report.type === 'direct' ? '#1d4ed8' : report.type === 'transfer' ? '#7c3aed' : '#b45309';

  // ── General Info
  let html = `
    <div class="detail-section">
      <h4>📦 General Information</h4>
      <div class="detail-row">
        <div class="detail-label">Brand</div>
        <div class="detail-value" style="font-weight:800;font-size:15px;">${report.brand}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Type</div>
        <div class="detail-value">
          <span style="background:${typeBadgeColor};color:#fff;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;">${typeLabel}</span>
        </div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date</div>
        <div class="detail-value">${report.deliveryDate}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Category</div>
        <div class="detail-value">${report.category}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Total Boxes</div>
        <div class="detail-value"><strong>${report.totalBoxes}</strong></div>
      </div>
      ${report.remarks ? `
      <div class="detail-row">
        <div class="detail-label">Remarks</div>
        <div class="detail-value" style="color:#78716c;font-style:italic;">${report.remarks}</div>
      </div>` : ''}
    </div>`;

  // ── Sales Invoices / Transfer Receipts
  const siLabel = report.type === 'direct' ? 'Sales Invoice' : 'Transfer Receipt';
  report.salesInvoices.forEach((si, i) => {
    const variance  = si.actualUnits - si.siUnits;
    const vClass    = variance >= 0 ? 'positive' : 'negative';
    const vSign     = variance >= 0 ? '+' : '';
    const totalVal  = Number(si.retailPrice || 0) * si.actualUnits;

    html += `
    <div class="detail-section" style="border-left:3px solid ${typeBadgeColor};">
      <h4>📋 ${siLabel} #${i + 1}</h4>
      <div class="si-detail-grid">
        <div class="si-detail-item">
          <strong>${report.type === 'direct' ? 'PO Number' : 'TR Number'}</strong>
          <span>${si.poNumber || si.trNumber || '—'}</span>
        </div>
        <div class="si-detail-item">
          <strong>${report.type === 'direct' ? 'SI Number' : 'DR Number'}</strong>
          <span>${si.siNumber || si.drNumber || '—'}</span>
        </div>
        <div class="si-detail-item">
          <strong>SI Units</strong>
          <span>${si.siUnits}</span>
        </div>
        <div class="si-detail-item">
          <strong>Actual Units</strong>
          <span>${si.actualUnits}</span>
        </div>
        <div class="si-detail-item">
          <strong>Variance</strong>
          <span class="detail-value ${vClass}" style="font-weight:800;">${vSign}${variance}</span>
        </div>
        <div class="si-detail-item">
          <strong>Retail Price / unit</strong>
          <span>₱${Number(si.retailPrice || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</span>
        </div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#64748b;font-weight:700;">TOTAL VALUE</span>
        <span style="font-size:15px;font-weight:900;color:rgb(255,120,50);">₱${totalVal.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
      </div>
    </div>`;
  });

  // ── Footer meta
  if (report.createdAt || report.updatedAt) {
    html += `<div class="detail-section" style="background:transparent;border:1px dashed var(--border);">`;
    if (report.createdAt) {
      html += `<div class="detail-row"><div class="detail-label" style="color:#94a3b8;">Created</div>
        <div class="detail-value" style="color:#94a3b8;font-size:12px;">${new Date(report.createdAt).toLocaleString()}</div></div>`;
    }
    if (report.updatedAt) {
      html += `<div class="detail-row"><div class="detail-label" style="color:#94a3b8;">Last Updated</div>
        <div class="detail-value" style="color:#94a3b8;font-size:12px;">${new Date(report.updatedAt).toLocaleString()}</div></div>`;
    }
    html += `</div>`;
  }

  document.getElementById('viewReportContent').innerHTML = html;
  document.getElementById('viewReportModal').classList.remove('hidden');
}

function closeViewModal() {
  document.getElementById('viewReportModal').classList.add('hidden');
  _viewingReport = null;
}

// Edit button inside view modal → triggers existing password-verify flow
function _viewModalEdit() {
  if (!_viewingReport) return;
  closeViewModal();
  requestEditReport(_viewingReport.month, _viewingReport.year, _viewingReport.id);
}

// ── Export (unchanged business logic) ────────────────────
function exportMonthToExcel() { showExportPreview(); }

function showExportPreview() {
  let reportsToExport = allMonthReports;
  if (selectedBrandFilter !== 'All')
    reportsToExport = reportsToExport.filter(r => r.brand.toLowerCase() === selectedBrandFilter.toLowerCase());
  if (reportsToExport.length === 0) { alert('No reports to export!'); return; }

  const totalSI = reportsToExport.reduce((s,r) => s + r.salesInvoices.reduce((a,si)=>a+si.siUnits,0), 0);
  const totalActual = reportsToExport.reduce((s,r) => s + r.salesInvoices.reduce((a,si)=>a+si.actualUnits,0), 0);
  const totalVariance = totalActual - totalSI;
  const totalValue = reportsToExport.reduce((s,r) => s + r.salesInvoices.reduce((a,si)=>a+Number(si.retailPrice||0),0), 0);

  document.getElementById('exportPreviewContent').innerHTML = `
    <div class="export-info-section">
      <h4>📋 Export Summary</h4>
      <div class="export-detail-row"><span class="export-label">Month:</span><span class="export-value">${currentMonth} ${currentYear}</span></div>
      <div class="export-detail-row"><span class="export-label">Brand Filter:</span><span class="export-value">${selectedBrandFilter}</span></div>
      <div class="export-detail-row"><span class="export-label">Total Reports:</span><span class="export-value">${reportsToExport.length}</span></div>
      <div class="export-detail-row"><span class="export-label">Total SI Units:</span><span class="export-value">${totalSI.toLocaleString()}</span></div>
      <div class="export-detail-row"><span class="export-label">Total Variance:</span><span class="export-value" style="color:${totalVariance>=0?'#16a34a':'#ef4444'}">${totalVariance>=0?'+':''}${totalVariance}</span></div>
      <div class="export-detail-row"><span class="export-label">Total Retail Value:</span><span class="export-value">₱${totalValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
    </div>`;

  document.getElementById('exportPreviewModal').classList.remove('hidden');
}

function closeExportPreview() {
  document.getElementById('exportPreviewModal').classList.add('hidden');
}

function performExcelExport() {
  let reportsToExport = allMonthReports;
  if (selectedBrandFilter !== 'All')
    reportsToExport = reportsToExport.filter(r => r.brand.toLowerCase() === selectedBrandFilter.toLowerCase());

  closeExportPreview();

  const wb = XLSX.utils.book_new();
  const data = [['Delivery Date','PO/TR Number','Brand','SI/DR Number','SI Units','Actual Units','Variance','Retail Price','Total Boxes','Category','Remarks']];
  let tSI=0,tActual=0,tVariance=0,tRetail=0,tBoxes=0;

  reportsToExport.forEach(r => {
    r.salesInvoices.forEach(si => {
      const v = si.actualUnits - si.siUnits;
      tSI+=si.siUnits; tActual+=si.actualUnits; tVariance+=v;
      tRetail+=Number(si.retailPrice||0); tBoxes+=r.totalBoxes;
      data.push([r.deliveryDate, si.poNumber||si.trNumber||'', r.brand, si.siNumber||si.drNumber||'',
        si.siUnits, si.actualUnits, v,
        `₱${Number(si.retailPrice||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
        r.totalBoxes, r.category, r.remarks||'']);
    });
  });
  data.push([]);
  data.push(['','','','TOTAL:',tSI,tActual,tVariance,`₱${tRetail.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,tBoxes,'','']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:12},{wch:15},{wch:15},{wch:15},{wch:10},{wch:12},{wch:10},{wch:18},{wch:12},{wch:20},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws, `${currentMonth} ${currentYear}`);
  XLSX.writeFile(wb, `${currentMonth}_${currentYear}_DeliveryReport.xlsx`);
}