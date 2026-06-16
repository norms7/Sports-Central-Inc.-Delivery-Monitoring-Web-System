// Annual Analytics

// =====================================================
// ANNUAL ANALYTICS
// =====================================================
let annualCharts = {};

const BRAND_COLORS = {
  'Nike':          '#FF6B00',
  'Adidas':        '#4A90E2',
  'Under Armour':  '#34D399',
  'Reebok':        '#EF4444',
  'Puma':          '#FBBF24',
  'Jordan':        '#DC2626',
  'New Balance':   '#8B5CF6'
};

async function showAnnualAnalytics() {
  // Hide sibling sections on archives.html
  ['archivesPage','monthViewPage','analyticsPage','editReportPage']
    .forEach(id => document.getElementById(id)?.classList.add('hidden'));

  document.getElementById('annualAnalyticsPage').classList.remove('hidden');

  // Populate year dropdown from DB
  await populateAnnualYearDropdown();

  generateAnnualAnalytics();
}

function backFromAnnualAnalytics() {
  document.getElementById('annualAnalyticsPage').classList.add('hidden');
  document.getElementById('archivesPage').classList.remove('hidden');
}

async function generateAnnualAnalytics() {
  const year = parseInt(document.getElementById('annualYearSelect').value, 10);

  document.getElementById('annualAnalyticsTitle').textContent = `📅 ${year} Annual Analytics`;
  document.getElementById('annualAnalyticsSubtitle').textContent = `Full-year delivery insights for ${year}`;

  // Destroy old charts
  Object.values(annualCharts).forEach(c => c?.destroy());
  annualCharts = {};

  // Show loading state
  const kpis = ['annualMetricDeliveries','annualMetricUnits','annualMetricVariance',
    'annualMetricAccuracy','annualMetricValue','annualMetricPeak'];
  kpis.forEach(id => { const el=document.getElementById(id); if(el) el.textContent='…'; });

  // ── Fetch all year data from Supabase ──────────────────
  let allReports = [];
  const monthlyData = {};
  const monthReportsMap = {};

  try {
    allReports = await dbGetYearReports(year);
  } catch(e) {
    console.error('Annual analytics fetch error:', e);
    kpis.forEach(id => { const el=document.getElementById(id); if(el) el.textContent='Error'; });
    return;
  }

  // Group into months
  MONTHS.forEach(month => { monthReportsMap[month] = []; });
  allReports.forEach(r => {
    const m = MONTHS[new Date(r.deliveryDate).getMonth()];
    if (monthReportsMap[m]) monthReportsMap[m].push(r);
  });

  MONTHS.forEach(month => {
    const reports = monthReportsMap[month];

    let mDeliveries = reports.length;
    let mUnits = 0, mVariance = 0, mValue = 0;
    reports.forEach(r => {
      r.salesInvoices.forEach(si => {
        mUnits    += si.siUnits;
        mVariance += (si.actualUnits - si.siUnits);
        mValue    += Number(si.retailPrice || 0);
      });
    });
    monthlyData[month] = { deliveries: mDeliveries, units: mUnits, variance: mVariance, value: mValue };
  });

  if (allReports.length === 0) {
    _annualShowEmpty(year);
    return;
  }

  // ── Global totals ─────────────────────────────────
  let totalDeliveries = allReports.length;
  let totalUnits = 0, totalVariance = 0, totalValue = 0;

  let brandData     = {};   // deliveries count
  let brandUnitsMap = {};   // total SI units
  let brandVariance = {};   // net variance
  let brandValue    = {};   // retail value
  let categoryData  = {};
  let typeData      = { direct: 0, transfer: 0, pullout: 0 };

  // Monthly brand stacks: { month: { brand: count } }
  let monthlyBrandStack = {};
  MONTHS.forEach(m => {
    monthlyBrandStack[m] = {};
    BRANDS.forEach(b => { monthlyBrandStack[m][b] = 0; });
  });

  BRANDS.forEach(b => {
    brandData[b]     = 0;
    brandUnitsMap[b] = 0;
    brandVariance[b] = 0;
    brandValue[b]    = 0;
  });

  allReports.forEach(r => {
    const month = MONTHS[new Date(r.deliveryDate).getMonth()];

    brandData[r.brand] = (brandData[r.brand] || 0) + 1;
    monthlyBrandStack[month][r.brand] = (monthlyBrandStack[month][r.brand] || 0) + 1;

    const cat = r.category?.includes('Shoes') && r.category?.includes('Bags') ? 'Others/Mix' : (r.category || 'Unknown');
    categoryData[cat] = (categoryData[cat] || 0) + 1;

    const type = r.type || 'direct';
    typeData[type]++;

    let rUnits = 0, rActual = 0, rValue = 0;
    (r.salesInvoices || []).forEach(si => {
      rUnits   += si.siUnits;
      rActual  += si.actualUnits;
      rValue   += Number(si.retailPrice || 0);
    });

    totalUnits    += rUnits;
    totalVariance += (rActual - rUnits);
    totalValue    += rValue;

    brandUnitsMap[r.brand] = (brandUnitsMap[r.brand] || 0) + rUnits;
    brandVariance[r.brand] = (brandVariance[r.brand] || 0) + (rActual - rUnits);
    brandValue[r.brand]    = (brandValue[r.brand]    || 0) + rValue;
  });

  const overallAccuracy = totalUnits > 0
    ? Math.min(100, 100 - (Math.abs(totalVariance) / totalUnits) * 100)
    : 100;

  // Peak month
  const peakMonth = MONTHS.reduce((best, m) =>
    monthlyData[m].deliveries > monthlyData[best].deliveries ? m : best, MONTHS[0]);

  // ── KPI banner ────────────────────────────────────
  document.getElementById('annualMetricDeliveries').textContent = totalDeliveries.toLocaleString();
  document.getElementById('annualMetricUnits').textContent      = totalUnits.toLocaleString();
  const vEl = document.getElementById('annualMetricVariance');
  vEl.textContent   = (totalVariance >= 0 ? '+' : '') + totalVariance.toLocaleString();
  vEl.style.color   = totalVariance >= 0 ? '#16a34a' : '#ef4444';
  document.getElementById('annualMetricAccuracy').textContent   = overallAccuracy.toFixed(1) + '%';
  document.getElementById('annualMetricValue').textContent      = '₱' + totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 });
  document.getElementById('annualMetricPeak').textContent       = peakMonth.substring(0, 3);

  // ── Charts ────────────────────────────────────────
  _annualMonthlyVolumeChart(monthlyData);
  _annualMonthlyUnitsChart(monthlyData);
  _annualBrandStackedChart(monthlyBrandStack);
  _annualMonthlyVarianceChart(monthlyData, monthReportsMap);
  _annualBrandShareChart(brandData);
  _annualCategoryChart(categoryData);
  _annualTypeChart(typeData);
  _annualBrandRadarChart(brandUnitsMap, brandVariance);
  _annualBrandValueChart(brandValue);

  // ── Tables ────────────────────────────────────────
  _annualMonthlySummaryTable(monthlyData);
  _annualBrandLeaderboard(brandData, brandUnitsMap, brandVariance, brandValue);
}

function _annualShowEmpty(year) {
  ['annualMetricDeliveries','annualMetricUnits','annualMetricVariance',
   'annualMetricAccuracy','annualMetricValue','annualMetricPeak']
    .forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '—'; });

  document.getElementById('annualMonthlySummaryBody').innerHTML =
    '<tr><td colspan="6" style="text-align:center;padding:20px;color:#78716c;">No data for ' + year + '</td></tr>';
  document.getElementById('annualBrandLeaderboard').innerHTML =
    '<div style="padding:20px;text-align:center;color:#78716c;">No data for ' + year + '</div>';
}

// Chart helpers
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DARK_TOOLTIP = {
  backgroundColor: 'rgba(28,25,23,0.95)',
  padding: 12,
  titleFont: { size: 13, weight: 'bold' },
  bodyFont: { size: 12 },
  borderColor: 'rgb(255,150,79)',
  borderWidth: 2
};

function _annualMonthlyVolumeChart(md) {
  const ctx = document.getElementById('annualMonthlyVolumeChart');
  const values = MONTHS.map(m => md[m].deliveries);
  const maxVal = Math.max(...values, 1);

  annualCharts.monthlyVolume = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTH_LABELS,
      datasets: [{
        label: 'Deliveries',
        data: values,
        backgroundColor: values.map(v => v === maxVal
          ? 'rgba(255,107,0,0.9)' : 'rgba(255,150,79,0.55)'),
        borderColor: values.map(v => v === maxVal ? 'rgb(255,107,0)' : 'rgb(255,150,79)'),
        borderWidth: 2,
        borderRadius: 8,
        order: 2
      },{
        label: 'Trend',
        data: values,
        type: 'line',
        borderColor: 'rgb(59,130,246)',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(59,130,246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.4,
        fill: true,
        order: 1
      }]
    },
    options: _annualBarOptions('Deliveries', v => v + ' deliveries')
  });
}

function _annualMonthlyUnitsChart(md) {
  const ctx = document.getElementById('annualMonthlyUnitsChart');
  const values = MONTHS.map(m => md[m].units);

  annualCharts.monthlyUnits = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTH_LABELS,
      datasets: [{
        label: 'Units',
        data: values,
        backgroundColor: 'rgba(139,92,246,0.12)',
        borderColor: 'rgb(139,92,246)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(139,92,246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 9,
        tension: 0.4,
        fill: true
      }]
    },
    options: _annualLineOptions('Units', v => v.toLocaleString() + ' units')
  });
}

function _annualBrandStackedChart(mbStack) {
  const ctx = document.getElementById('annualBrandStackedChart');
  const datasets = BRANDS.map(brand => ({
    label: brand,
    data: MONTHS.map(m => mbStack[m][brand] || 0),
    backgroundColor: (BRAND_COLORS[brand] || '#ccc') + 'CC',
    borderColor: BRAND_COLORS[brand] || '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    stack: 'brands'
  }));

  annualCharts.brandStacked = new Chart(ctx, {
    type: 'bar',
    data: { labels: MONTH_LABELS, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12, weight: '600' }, padding: 14, usePointStyle: true } },
        tooltip: { ...DARK_TOOLTIP, mode: 'index', intersect: false }
      },
      scales: {
        x: { stacked: true, ticks: { font: { size: 12, weight: '600' } }, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0, font: { size: 12, weight: '600' } }, grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    }
  });
}

function _annualMonthlyVarianceChart(md, monthReportsMap) {
  const container = document.getElementById('annualVarianceDetailTable');
  if (!container) return;

  // Build month summary rows — click expands per-SI detail
  let html = '<div class="av-table-wrapper"><table class="av-summary-table">';
  html += `<thead><tr>
    <th></th>
    <th>Month</th>
    <th>SI Units</th>
    <th>Actual Units</th>
    <th>Variance</th>
    <th>Accuracy</th>
    <th>Records</th>
  </tr></thead><tbody>`;

  MONTHS.forEach((month, idx) => {
    const d = md[month];
    const acc = d.units > 0 ? Math.max(0, 100 - (Math.abs(d.variance) / d.units) * 100) : 100;
    const vSign = d.variance >= 0 ? '+' : '';
    const vClass = d.variance > 0 ? 'vt-positive' : d.variance < 0 ? 'vt-negative' : 'vt-zero';
    const accClass = acc >= 95 ? 'acc-good' : acc >= 80 ? 'acc-ok' : 'acc-bad';
    const hasData = d.deliveries > 0;
    const expandId = `avExpand_${idx}`;

    html += `
      <tr class="av-month-row ${hasData ? 'av-clickable' : 'av-empty-month'}"
          onclick="${hasData ? `_avToggleMonth('${expandId}')` : ''}">
        <td class="av-expand-icon" id="${expandId}_icon">${hasData ? '▶' : '—'}</td>
        <td><strong>${month}</strong></td>
        <td>${d.units.toLocaleString()}</td>
        <td>${(d.units + d.variance).toLocaleString()}</td>
        <td class="${vClass}"><strong>${vSign}${d.variance}</strong></td>
        <td><span class="variance-acc-badge ${accClass}">${acc.toFixed(1)}%</span></td>
        <td>${d.deliveries}</td>
      </tr>
      <tr id="${expandId}" class="av-detail-row hidden">
        <td colspan="7" style="padding:0;">
          ${hasData ? _avBuildDetailRows(monthReportsMap[month], month) : ''}
        </td>
      </tr>`;
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function _avToggleMonth(expandId) {
  const row = document.getElementById(expandId);
  const icon = document.getElementById(expandId + '_icon');
  if (!row) return;
  const isHidden = row.classList.contains('hidden');
  row.classList.toggle('hidden', !isHidden);
  if (icon) icon.textContent = isHidden ? '▼' : '▶';
}

function _avBuildDetailRows(reports, month) {
  if (!reports || reports.length === 0) return '';

  // Flatten to SI rows, sort by abs variance desc
  const rows = [];
  reports.forEach(report => {
    report.salesInvoices.forEach(si => {
      const variance = si.actualUnits - si.siUnits;
      rows.push({
        date:     report.deliveryDate,
        brand:    report.brand,
        poTr:     si.poNumber || si.trNumber || '—',
        siDr:     si.siNumber || si.drNumber || '—',
        siUnits:  si.siUnits,
        actual:   si.actualUnits,
        variance,
        remarks:  report.remarks || ''
      });
    });
  });
  rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  let html = `<table class="av-detail-table">
    <thead>
      <tr>
        <th>#</th><th>Date</th><th>Brand</th><th>PO/TR No.</th>
        <th>SI/DR No.</th><th>SI Units</th><th>Actual</th>
        <th>Variance</th><th>Accuracy</th><th>Remarks</th>
      </tr>
    </thead><tbody>`;

  rows.forEach((row, i) => {
    const vSign = row.variance >= 0 ? '+' : '';
    const vClass = row.variance > 0 ? 'vt-positive' : row.variance < 0 ? 'vt-negative' : 'vt-zero';
    const acc = row.siUnits > 0 ? Math.max(0, 100 - (Math.abs(row.variance) / row.siUnits) * 100) : 100;
    const accClass = acc >= 95 ? 'acc-good' : acc >= 80 ? 'acc-ok' : 'acc-bad';
    const remarks = row.remarks
      ? `<span class="vt-remarks" title="${row.remarks.replace(/"/g, '&quot;')}">💬 ${row.remarks}</span>`
      : '<span style="color:#ccc;">—</span>';

    html += `<tr>
      <td>${i + 1}</td>
      <td>${row.date}</td>
      <td>${row.brand}</td>
      <td>${row.poTr}</td>
      <td>${row.siDr}</td>
      <td>${row.siUnits}</td>
      <td>${row.actual}</td>
      <td class="${vClass}"><strong>${vSign}${row.variance}</strong></td>
      <td><span class="variance-acc-badge ${accClass}">${acc.toFixed(1)}%</span></td>
      <td>${remarks}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  return html;
}


function _annualBrandShareChart(bd) {
  const ctx = document.getElementById('annualBrandShareChart');
  const labels = Object.keys(bd);
  const values = Object.values(bd);

  annualCharts.brandShare = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: labels.map(b => BRAND_COLORS[b] || '#ccc'), borderColor: '#fff', borderWidth: 3 }]
    },
    options: _annualDoughnutOptions()
  });
}

function _annualCategoryChart(cd) {
  const ctx = document.getElementById('annualCategoryChart');
  const CAT_COLORS = { 'Shoes':'#FF6B00','Bags':'#EF4444','Apparel':'#8B5CF6','Shoes and Apparel':'#F59E0B','Others/Mix':'#FF8C00','Accessories':'#3B82F6' };
  const labels = Object.keys(cd);
  const values = Object.values(cd);

  annualCharts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: labels.map(l => CAT_COLORS[l] || 'rgb(255,150,79)'), borderColor: '#fff', borderWidth: 3 }]
    },
    options: _annualDoughnutOptions()
  });
}

function _annualTypeChart(td) {
  const ctx = document.getElementById('annualTypeChart');
  annualCharts.type = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Direct Delivery','Transfer Receiving','Pullout Receiving'],
      datasets: [{ data: [td.direct||0, td.transfer||0, td.pullout||0], backgroundColor: ['rgb(255,150,79)','rgb(59,130,246)','rgb(168,85,247)'], borderColor: '#fff', borderWidth: 3 }]
    },
    options: _annualDoughnutOptions()
  });
}

function _annualBrandRadarChart(brandUnits, brandVar) {
  const ctx = document.getElementById('annualBrandRadarChart');
  const labels = BRANDS;
  const accuracyValues = BRANDS.map(b => {
    const u = brandUnits[b] || 0;
    return u > 0 ? Math.max(0, 100 - (Math.abs(brandVar[b] || 0) / u) * 100) : 100;
  });

  annualCharts.radar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyValues,
        backgroundColor: 'rgba(255,150,79,0.2)',
        borderColor: 'rgb(255,150,79)',
        borderWidth: 2,
        pointBackgroundColor: labels.map(b => BRAND_COLORS[b] || 'rgb(255,150,79)'),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...DARK_TOOLTIP, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` } }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, font: { size: 11 }, backdropColor: 'transparent' },
          grid: { color: 'rgba(0,0,0,0.07)' },
          pointLabels: { font: { size: 12, weight: '700' } }
        }
      }
    }
  });
}

function _annualBrandValueChart(bv) {
  const ctx = document.getElementById('annualBrandValueChart');
  const labels = BRANDS;
  const values = labels.map(b => bv[b] || 0);

  annualCharts.brandValue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Retail Value',
        data: values,
        backgroundColor: labels.map(b => (BRAND_COLORS[b] || '#ccc') + 'CC'),
        borderColor: labels.map(b => BRAND_COLORS[b] || '#ccc'),
        borderWidth: 2,
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...DARK_TOOLTIP, callbacks: { label: ctx => ` ₱${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}` } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '₱' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v), font: { size: 12, weight: '600' } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: { ticks: { font: { size: 12, weight: '600' } }, grid: { display: false } }
      }
    }
  });
}

// Option factories
function _annualBarOptions(yLabel, tooltipFmt) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12, weight: '600' }, padding: 14, usePointStyle: true } },
      tooltip: { ...DARK_TOOLTIP, callbacks: { label: ctx => ' ' + tooltipFmt(ctx.parsed.y) } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 12, weight: '600' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { ticks: { font: { size: 12, weight: '600' } }, grid: { display: false } }
    }
  };
}

function _annualLineOptions(yLabel, tooltipFmt) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...DARK_TOOLTIP, callbacks: { label: ctx => ' ' + tooltipFmt(ctx.parsed.y) } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 12, weight: '600' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { ticks: { font: { size: 12, weight: '600' } }, grid: { display: false } }
    }
  };
}

function _annualDoughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12, weight: '600' }, padding: 14, usePointStyle: true } },
      tooltip: {
        ...DARK_TOOLTIP,
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return ` ${ctx.label}: ${ctx.parsed} (${((ctx.parsed / total) * 100).toFixed(1)}%)`;
          }
        }
      }
    }
  };
}

// Table builders
function _annualMonthlySummaryTable(md) {
  const tbody = document.getElementById('annualMonthlySummaryBody');
  const allVals = MONTHS.map(m => md[m].deliveries);
  const peak = Math.max(...allVals);

  let html = '';
  MONTHS.forEach(month => {
    const d = md[month];
    const acc = d.units > 0 ? Math.max(0, 100 - (Math.abs(d.variance) / d.units) * 100) : 100;
    const isPeak = d.deliveries === peak && peak > 0;
    const vColor = d.variance >= 0 ? '#16a34a' : '#ef4444';

    html += `<tr class="${isPeak ? 'annual-peak-row' : ''}">
      <td><strong>${month.substring(0, 3)}</strong>${isPeak ? ' 🔥' : ''}</td>
      <td>${d.deliveries}</td>
      <td>${d.units.toLocaleString()}</td>
      <td style="color:${vColor};font-weight:800;">${d.variance >= 0 ? '+' : ''}${d.variance}</td>
      <td><span class="annual-acc-badge ${acc >= 95 ? 'acc-good' : acc >= 80 ? 'acc-ok' : 'acc-bad'}">${acc.toFixed(1)}%</span></td>
      <td>₱${d.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}</td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function _annualBrandLeaderboard(bd, bu, bv, bVal) {
  const container = document.getElementById('annualBrandLeaderboard');

  const sorted = BRANDS.map(brand => {
    const units = bu[brand] || 0;
    const variance = bv[brand] || 0;
    const acc = units > 0 ? Math.max(0, 100 - (Math.abs(variance) / units) * 100) : 100;
    return { brand, deliveries: bd[brand] || 0, units, variance, acc, value: bVal[brand] || 0 };
  }).sort((a, b) => b.acc - a.acc);

  const medals = ['🥇', '🥈', '🥉'];
  let html = '';
  sorted.forEach(({ brand, deliveries, units, variance, acc, value }, i) => {
    const rank = medals[i] || `#${i + 1}`;
    const vColor = variance >= 0 ? '#16a34a' : '#ef4444';
    const dot = BRAND_COLORS[brand] || '#ccc';
    html += `
      <div class="annual-leader-item">
        <div class="annual-leader-rank">${rank}</div>
        <div class="annual-leader-dot" style="background:${dot};"></div>
        <div class="annual-leader-info">
          <div class="annual-leader-brand">${brand}</div>
          <div class="annual-leader-sub">${deliveries} deliveries · ${units.toLocaleString()} units · <span style="color:${vColor};">${variance >= 0 ? '+' : ''}${variance}</span></div>
          <div class="annual-leader-val">₱${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
        </div>
        <div class="annual-leader-score ${acc >= 95 ? 'acc-good' : acc >= 80 ? 'acc-ok' : 'acc-bad'}">${acc.toFixed(1)}%</div>
      </div>`;
  });
  container.innerHTML = html || '<div style="padding:20px;text-align:center;color:#78716c;">No data</div>';
}

// =====================================================
// ANNUAL EXCEL EXPORT — one sheet per month + Annual Summary
// =====================================================

// Shared report-rows builder (same column layout as monthly export)
function _annualSheetData(reports) {
  const data = [];

  data.push([
    'Delivery Date', 'PO Number', 'Brand', 'SI Number',
    'SI Units', 'Actual Units', 'Variance', 'Retail Price',
    'Total Boxes', 'Category', 'Remarks'
  ]);

  let totalSIUnits = 0, totalActualUnits = 0, totalVariance = 0, totalRetailPrice = 0, totalBoxes = 0;

  reports.forEach(report => {
    report.salesInvoices.forEach(si => {
      const variance = si.actualUnits - si.siUnits;
      const retailPrice = Number(si.retailPrice);

      totalSIUnits     += si.siUnits;
      totalActualUnits += si.actualUnits;
      totalVariance    += variance;
      totalRetailPrice += retailPrice;
      totalBoxes       += report.totalBoxes;

      data.push([
        report.deliveryDate,
        si.poNumber || si.trNumber || '',
        report.brand,
        si.siNumber || si.drNumber || '',
        si.siUnits,
        si.actualUnits,
        variance,
        `₱${retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        report.totalBoxes,
        report.category,
        report.remarks || ''
      ]);
    });
  });

  data.push([]);
  data.push([
    '', '', '', 'TOTAL:',
    totalSIUnits, totalActualUnits, totalVariance,
    `₱${totalRetailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalBoxes, '', ''
  ]);

  return data;
}

function _annualStyleSheet(ws, dataLength) {
  ws['!cols'] = [
    { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
    { wch: 12 }, { wch: 20 }, { wch: 30 }
  ];

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  const totalRowIndex = dataLength - 1;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "FFD966" } },
      alignment: { horizontal: col >= 4 && col <= 8 ? "right" : "left", vertical: "center" }
    };
  }

  return ws;
}

// Build the Annual Summary sheet (12-row month breakdown + grand totals)
function _annualSummarySheetData(year, monthReportsMap) {
  const data = [];
  data.push([`ANNUAL DELIVERY REPORT — ${year}`]);
  data.push([]);
  data.push(['Month', 'Deliveries', 'SI Units', 'Actual Units', 'Variance', 'Accuracy %', 'Retail Value']);

  let grandDeliveries = 0, grandSI = 0, grandActual = 0, grandVariance = 0, grandValue = 0;

  MONTHS.forEach(month => {
    const reports = monthReportsMap[month] || [];
    let mSI = 0, mActual = 0, mVariance = 0, mValue = 0;

    reports.forEach(report => {
      report.salesInvoices.forEach(si => {
        mSI       += si.siUnits;
        mActual   += si.actualUnits;
        mVariance += (si.actualUnits - si.siUnits);
        mValue    += Number(si.retailPrice || 0);
      });
    });

    const acc = mSI > 0 ? Math.max(0, 100 - (Math.abs(mVariance) / mSI) * 100) : 100;

    grandDeliveries += reports.length;
    grandSI         += mSI;
    grandActual     += mActual;
    grandVariance   += mVariance;
    grandValue      += mValue;

    data.push([
      month,
      reports.length,
      mSI,
      mActual,
      mVariance,
      Number(acc.toFixed(1)),
      `₱${mValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
  });

  const grandAcc = grandSI > 0 ? Math.max(0, 100 - (Math.abs(grandVariance) / grandSI) * 100) : 100;

  data.push([]);
  data.push([
    'TOTAL',
    grandDeliveries,
    grandSI,
    grandActual,
    grandVariance,
    Number(grandAcc.toFixed(1)),
    `₱${grandValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  return data;
}

function _annualStyleSummarySheet(ws) {
  ws['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 11 }, { wch: 18 }
  ];

  // Title row (merged)
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "FF6B00" } }
    };
  }

  // Header row (row index 2 → row 3 in sheet)
  for (let col = 0; col <= 6; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c: col });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // Total row = last row
  const range = XLSX.utils.decode_range(ws['!ref']);
  const totalRow = range.e.r;
  for (let col = 0; col <= 6; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRow, c: col });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "FFD966" } },
      alignment: { horizontal: col === 0 ? "left" : "right", vertical: "center" }
    };
  }

  return ws;
}

// ── Main entry point: triggered by "Export Annual Report" button ───────────
function exportAnnualToExcel() {
  const year = parseInt(document.getElementById('annualYearSelect').value, 10);

  // Load every month's reports for this year
  const monthReportsMap = {};
  let totalRecords = 0;
  let monthsWithData = 0;

  MONTHS.forEach(month => {
    const reports = JSON.parse(localStorage.getItem(getStorageKey(year, month))) || [];
    monthReportsMap[month] = reports;
    if (reports.length > 0) monthsWithData++;
    totalRecords += reports.length;
  });

  if (totalRecords === 0) {
    alert(`No delivery records found for ${year}.`);
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Annual Summary
  const summaryData = _annualSummarySheetData(year, monthReportsMap);
  let ws_summary = XLSX.utils.aoa_to_sheet(summaryData);
  ws_summary = _annualStyleSummarySheet(ws_summary);
  XLSX.utils.book_append_sheet(wb, ws_summary, 'Annual Summary');

  // Sheets 2-13: One per month (only months that have data)
  MONTHS.forEach(month => {
    const reports = monthReportsMap[month];
    if (reports.length === 0) return;

    const sheetData = _annualSheetData(reports);
    let ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws = _annualStyleSheet(ws, sheetData.length);

    // Sheet name max 31 chars, e.g. "January"
    const sheetName = month.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const filename = `${year}_Annual_DeliveryReport.xlsx`;
  XLSX.writeFile(wb, filename);

  alert(`Annual report downloaded!\n\nFile: ${filename}\nSheets: Annual Summary + ${monthsWithData} month sheet(s)\nTotal records: ${totalRecords}`);
}

// =====================================================
// ANNUAL EXCEL IMPORT — password gated, merges per-month sheets
// =====================================================

let _pendingImportData = null; // { year, monthReports: { Jan: [...], ... }, totalRows }

// ── Step 1: Open password modal ─────────────────────────────────────────────
function requestImportAnnualData() {
  document.getElementById('importPassword').value = '';
  document.getElementById('importPasswordError').classList.add('hidden');
  document.getElementById('importPasswordModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('importPassword')?.focus(), 100);
}

function cancelImportPasswordModal() {
  document.getElementById('importPasswordModal').classList.add('hidden');
}

// ── Step 2: Verify password → open file picker ─────────────────────────────
function verifyImportPassword() {
  const entered = document.getElementById('importPassword').value;
  if (entered === PASSWORD) {
    document.getElementById('importPasswordModal').classList.add('hidden');
    document.getElementById('annualImportFileInput').click();
  } else {
    document.getElementById('importPasswordError').classList.remove('hidden');
  }
}

// ── Step 3: Read the chosen .xlsx file ──────────────────────────────────────
function handleAnnualImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      _parseImportedWorkbook(wb, file.name);
    } catch (err) {
      console.error(err);
      alert('Could not read this file. Please make sure it is a valid .xlsx export from this app.');
    }
    event.target.value = ''; // reset so the same file can be re-selected later
  };
  reader.readAsArrayBuffer(file);
}

// Map a sheet name (e.g. "January") back to a MONTHS entry, case-insensitive
function _monthFromSheetName(name) {
  const norm = name.trim().toLowerCase();
  return MONTHS.find(m => m.toLowerCase() === norm) || null;
}

// Parse rows of a month sheet (skip header row + totals row + blank rows)
function _rowsToReports(rows, fallbackYear) {
  // rows: array of arrays, row[0] = header
  const reports = [];
  if (!rows || rows.length < 2) return reports;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;            // blank separator row
    if (String(row[3] || '').toUpperCase() === 'TOTAL:') continue; // totals row
    const [deliveryDate, poNumber, brand, siNumber, siUnits, actualUnits, , retailPriceRaw, totalBoxes, category, remarks] = row;

    if (!deliveryDate || !brand) continue; // skip malformed rows

    // Retail price arrives as "₱1,234.56" — strip non-numeric chars
    let retailPrice = 0;
    if (typeof retailPriceRaw === 'number') {
      retailPrice = retailPriceRaw;
    } else if (typeof retailPriceRaw === 'string') {
      retailPrice = parseFloat(retailPriceRaw.replace(/[^\d.-]/g, '')) || 0;
    }

    reports.push({
      id: Date.now() + Math.floor(Math.random() * 1000000) + i,
      type: 'direct', // imported rows are reconstructed as direct-type entries
      salesInvoices: [{
        poNumber: poNumber || '',
        siNumber: siNumber || '',
        siUnits: Number(siUnits) || 0,
        actualUnits: Number(actualUnits) || 0,
        retailPrice: retailPrice
      }],
      brand: brand || 'Unknown',
      totalBoxes: Number(totalBoxes) || 0,
      deliveryDate: _normalizeDate(deliveryDate, fallbackYear),
      category: category || 'Imported',
      remarks: remarks || '(Imported from Annual Report)',
      createdAt: new Date().toISOString(),
      _imported: true
    });
  }

  return reports;
}

// Excel may give dates as strings ("2026-03-14") or serial numbers — normalize to YYYY-MM-DD
function _normalizeDate(value, fallbackYear) {
  if (typeof value === 'number') {
    // Excel serial date → JS date
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      const mm = String(d.m).padStart(2, '0');
      const dd = String(d.d).padStart(2, '0');
      return `${d.y}-${mm}-${dd}`;
    }
  }
  const str = String(value).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback: Jan 1 of the target year
  return `${fallbackYear}-01-01`;
}

// ── Parse the workbook into { year, monthReports } and show preview ────────
function _parseImportedWorkbook(wb, filename) {
  // Try to detect year from filename "2026_Annual_DeliveryReport.xlsx" or from Annual Summary sheet
  let year = null;
  const yearMatch = filename.match(/(20\d{2})/);
  if (yearMatch) year = parseInt(yearMatch[1], 10);

  if (!year) {
    // Fall back to currently selected annual year
    year = parseInt(document.getElementById('annualYearSelect').value, 10) || new Date().getFullYear();
  }

  const monthReports = {};
  let totalRows = 0;
  let sheetsFound = [];

  wb.SheetNames.forEach(sheetName => {
    if (sheetName === 'Annual Summary') return; // skip — informational only

    const month = _monthFromSheetName(sheetName);
    if (!month) return; // skip unrecognized sheets

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const reports = _rowsToReports(rows, year);

    if (reports.length > 0) {
      monthReports[month] = reports;
      totalRows += reports.length;
      sheetsFound.push({ month, count: reports.length });
    }
  });

  if (sheetsFound.length === 0) {
    alert('No recognizable month sheets found in this file.\n\nMake sure you are importing a file exported from this app (sheet names should be month names like "January", "February", etc.)');
    return;
  }

  _pendingImportData = { year, monthReports, totalRows };
  _showImportPreview(year, sheetsFound, totalRows, filename);
}

// ── Step 4: Show preview before committing ──────────────────────────────────
function _showImportPreview(year, sheetsFound, totalRows, filename) {
  const sheetsHtml = sheetsFound.map(s =>
    `<div class="export-sheet-item">✅ ${s.month} — ${s.count} record(s)</div>`
  ).join('');

  document.getElementById('importPreviewBody').innerHTML = `
    <div class="export-info-section">
      <h4>📁 File</h4>
      <div class="export-detail-row">
        <span class="export-label">Name:</span>
        <span class="export-value">${filename}</span>
      </div>
      <div class="export-detail-row">
        <span class="export-label">Target Year:</span>
        <span class="export-value">${year}</span>
      </div>
      <div class="export-detail-row">
        <span class="export-label">Total Records:</span>
        <span class="export-value">${totalRows}</span>
      </div>
    </div>
    <div class="export-info-section">
      <h4>📋 Months to Import</h4>
      <div class="export-sheets-list">${sheetsHtml}</div>
    </div>
    <div class="export-info-section">
      <p style="font-size:12px; color:#78716c;">
        ⚠️ Imported records will be <strong>added</strong> to existing data for each month
        (not replaced). Each row becomes a separate delivery record tagged
        <em>"(Imported from Annual Report)"</em> for traceability.
      </p>
    </div>
  `;

  document.getElementById('importPreviewModal').classList.remove('hidden');
}

function cancelImportPreview() {
  document.getElementById('importPreviewModal').classList.add('hidden');
  _pendingImportData = null;
}

// ── Step 5: Commit — merge into localStorage per month ──────────────────────
async function confirmImportAnnualData() {
  if (!_pendingImportData) return;

  const { year, monthReports, totalRows } = _pendingImportData;

  // Save imported reports to Supabase
  try {
    for (const month of Object.keys(monthReports)) {
      for (const report of monthReports[month]) {
        await dbSaveReport(report);
      }
    }
  } catch(e) {
    alert('Import failed: ' + e.message);
    return;
  }

  document.getElementById('importPreviewModal').classList.add('hidden');
  _pendingImportData = null;

  alert(`Import complete!\n\n${totalRows} record(s) added across ${Object.keys(monthReports).length} month(s) for ${year}.`);

  // Refresh year dropdowns and analytics
  await populateAnnualYearDropdown();
  document.getElementById('annualYearSelect').value = String(year);
  await generateAnnualAnalytics();
}
