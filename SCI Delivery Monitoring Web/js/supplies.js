// Supplies Delivery functions


// ========================================
// SUPPLIES DELIVERY FUNCTIONS
// ========================================

let suppliesItemCounter = 0;

function addSuppliesItem() {
  suppliesItemCounter++;
  const container = document.getElementById('suppliesItemsContainer');
  
  const itemHTML = `
<div class="si-entry" id="suppliesItem${suppliesItemCounter}" style="position: relative;">
  <button type="button" class="remove-si" onclick="removeSuppliesItem(${suppliesItemCounter})" title="Remove item">✕</button>
  
  <div class="form-row">
    <div class="form-group">
      <label>Item Code *</label>
      <input type="text" name="itemCode" placeholder="Item code" required onchange="updateSuppliesSummary()"/>
    </div>
    
    <div class="form-group">
      <label>Description *</label>
      <input type="text" name="description" placeholder="Item description" required/>
    </div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label>Request QTY *</label>
      <input type="number" name="requestQty" placeholder="0" min="0" required onchange="updateSuppliesSummary(); calculateItemTotal(${suppliesItemCounter})"/>
    </div>

    <div class="form-group">
      <label>Issued QTY *</label>
      <input type="number" name="issuedQty" placeholder="0" min="0" required onchange="updateSuppliesSummary(); calculateItemTotal(${suppliesItemCounter})"/>
    </div>

    <div class="form-group">
      <label>Unit Price *</label>
      <input type="number" name="unitPrice" placeholder="0.00" min="0" step="0.01" required onchange="updateSuppliesSummary(); calculateItemTotal(${suppliesItemCounter})"/>
    </div>

    <div class="form-group">
      <label>Total Price</label>
      <input type="text" id="totalPrice${suppliesItemCounter}" placeholder="₱0.00" readonly style="background: #f5f5f4; cursor: not-allowed;"/>
    </div>
  </div>
</div>
  `;
  
  container.insertAdjacentHTML('beforeend', itemHTML);
  updateSuppliesSummary();
}

function removeSuppliesItem(id) {
  const item = document.getElementById(`suppliesItem${id}`);
  if (item) {
item.remove();
updateSuppliesSummary();
  }
}

function calculateItemTotal(id) {
  const item = document.getElementById(`suppliesItem${id}`);
  if (!item) return;
  
  const issuedQty = parseFloat(item.querySelector('[name="issuedQty"]').value) || 0;
  const unitPrice = parseFloat(item.querySelector('[name="unitPrice"]').value) || 0;
  const total = issuedQty * unitPrice;
  
  item.querySelector(`#totalPrice${id}`).value = '₱' + total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function updateSuppliesSummary() {
  const items = document.querySelectorAll('#suppliesItemsContainer .si-entry');
  
  let totalItems = items.length;
  let totalRequestQty = 0;
  let totalIssuedQty = 0;
  let totalPrice = 0;
  
  items.forEach(item => {
const requestQty = parseFloat(item.querySelector('[name="requestQty"]').value) || 0;
const issuedQty = parseFloat(item.querySelector('[name="issuedQty"]').value) || 0;
const unitPrice = parseFloat(item.querySelector('[name="unitPrice"]').value) || 0;

totalRequestQty += requestQty;
totalIssuedQty += issuedQty;
totalPrice += (issuedQty * unitPrice);
  });
  
  document.getElementById('suppliesTotalItems').textContent = totalItems;
  document.getElementById('suppliesTotalRequestQty').textContent = totalRequestQty;
  document.getElementById('suppliesTotalIssuedQty').textContent = totalIssuedQty;
  document.getElementById('suppliesTotalPrice').textContent = '₱' + totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function saveSuppliesReport() {
  // Validate required fields
  const requestNumber = document.getElementById('suppliesRequestNumber').value.trim();
  const requestDate = document.getElementById('suppliesRequestDate').value;
  const receiveDate = document.getElementById('suppliesReceiveDate').value;
  const status = document.getElementById('suppliesStatus').value;
  const from = document.getElementById('suppliesFrom').value.trim();
  
  if (!requestNumber || !requestDate || !receiveDate || !status || !from) {
alert('Please fill in all required fields in Request Details.');
return;
  }
  
  // Collect items
  const itemEntries = document.querySelectorAll('#suppliesItemsContainer .si-entry');
  if (itemEntries.length === 0) {
alert('Please add at least one item.');
return;
  }
  
  const items = [];
  let valid = true;
  
  itemEntries.forEach(entry => {
const itemCode = entry.querySelector('[name="itemCode"]').value.trim();
const description = entry.querySelector('[name="description"]').value.trim();
const requestQty = parseInt(entry.querySelector('[name="requestQty"]').value, 10);
const issuedQty = parseInt(entry.querySelector('[name="issuedQty"]').value, 10);
const unitPrice = parseFloat(entry.querySelector('[name="unitPrice"]').value);

if (!itemCode || !description || isNaN(requestQty) || isNaN(issuedQty) || isNaN(unitPrice)) {
  valid = false;
  return;
}

items.push({
  itemCode,
  description,
  requestQty,
  issuedQty,
  unitPrice,
  totalPrice: issuedQty * unitPrice
});
  });
  
  if (!valid) {
alert('Please fill in all required fields for all items.');
return;
  }
  
  // Calculate totals
  const totalRequestQty = items.reduce((sum, item) => sum + item.requestQty, 0);
  const totalIssuedQty = items.reduce((sum, item) => sum + item.issuedQty, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Create report object
  const report = {
id: Date.now(),
type: 'supplies',
requestNumber,
requestDate,
receiveDate,
status,
from,
items,
totalItems: items.length,
totalRequestQty,
totalIssuedQty,
totalPrice,
remarks: document.getElementById('suppliesRemarks').value || '',
createdAt: new Date().toISOString()
  };
  
  // Get month and year from receive date
  const date = new Date(receiveDate);
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  
  // Save to localStorage
  const storageKey = `reports_${year}_${month}`;
  let reports = JSON.parse(localStorage.getItem(storageKey)) || [];
  reports.push(report);
  localStorage.setItem(storageKey, JSON.stringify(reports));
  
  // Show success message
  const successMsg = document.getElementById('suppliesSuccessMessage');
  successMsg.classList.remove('hidden');
  setTimeout(() => successMsg.classList.add('hidden'), 3000);
  
  // Reset form
  document.getElementById('suppliesDeliveryForm').reset();
  document.getElementById('suppliesItemsContainer').innerHTML = '';
  suppliesItemCounter = 0;
  updateSuppliesSummary();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ========================================
// SUPPLIES RECORDS FUNCTIONS
// ========================================

let suppliesChartsData = {};

function showSuppliesRecords() {
  // Hide form, show records
  document.getElementById('suppliesReportPage').classList.add('hidden');
  document.getElementById('suppliesRecordsPage').classList.remove('hidden');
  
  // Populate year dropdown
  populateSuppliesYears();
  
  // Load records if year/month selected
  loadSuppliesRecords();
}

function backToSuppliesForm() {
  document.getElementById('suppliesRecordsPage').classList.add('hidden');
  document.getElementById('suppliesReportPage').classList.remove('hidden');
}

function populateSuppliesYears() {
  const yearSelect = document.getElementById('suppliesFilterYear');
  const currentYear = new Date().getFullYear();
  const years = [];
  
  // Get years from localStorage
  for (let year = currentYear; year >= currentYear - 5; year--) {
years.push(year);
  }
  
  yearSelect.innerHTML = '<option value="">Select Year</option>';
  years.forEach(year => {
yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
  });
}

function loadSuppliesRecords() {
  const year = document.getElementById('suppliesFilterYear').value;
  const month = document.getElementById('suppliesFilterMonth').value;
  
  if (!year || !month) {
document.getElementById('suppliesRecordsTable').innerHTML = '<div class="empty">Please select both year and month to view records.</div>';
resetSuppliesMetrics();
return;
  }
  
  // Load from localStorage
  const storageKey = `reports_${year}_${month}`;
  const allReports = JSON.parse(localStorage.getItem(storageKey)) || [];
  const suppliesReports = allReports.filter(r => r.type === 'supplies');
  
  if (suppliesReports.length === 0) {
document.getElementById('suppliesRecordsTable').innerHTML = `<div class="empty">No supplies deliveries found for ${month} ${year}.</div>`;
resetSuppliesMetrics();
return;
  }
  
  // Calculate metrics
  calculateSuppliesMetrics(suppliesReports);
  
  // Render table
  renderSuppliesTable(suppliesReports);
  
  // Render charts
  renderSuppliesCharts(suppliesReports);
}

function resetSuppliesMetrics() {
  document.getElementById('suppliesMetricDeliveries').textContent = '0';
  document.getElementById('suppliesMetricItems').textContent = '0';
  document.getElementById('suppliesMetricQty').textContent = '0';
  document.getElementById('suppliesMetricValue').textContent = '₱0';
  
  // Clear charts
  if (suppliesChartsData.status) suppliesChartsData.status.destroy();
  if (suppliesChartsData.value) suppliesChartsData.value.destroy();
}

function calculateSuppliesMetrics(reports) {
  let totalDeliveries = reports.length;
  let totalItems = 0;
  let totalIssuedQty = 0;
  let totalValue = 0;
  
  reports.forEach(report => {
totalItems += report.totalItems || 0;
totalIssuedQty += report.totalIssuedQty || 0;
totalValue += report.totalPrice || 0;
  });
  
  document.getElementById('suppliesMetricDeliveries').textContent = totalDeliveries;
  document.getElementById('suppliesMetricItems').textContent = totalItems;
  document.getElementById('suppliesMetricQty').textContent = totalIssuedQty.toLocaleString();
  document.getElementById('suppliesMetricValue').textContent = '₱' + totalValue.toLocaleString('en-US', {minimumFractionDigits: 2});
}

function renderSuppliesTable(reports) {
  let html = `
<div class="table-scroll-wrapper">
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Request Number</th>
        <th>From</th>
        <th>Request Date</th>
        <th>Receive Date</th>
        <th>Status</th>
        <th>Items</th>
        <th>Issued QTY</th>
        <th>Total Price</th>
      </tr>
    </thead>
    <tbody>`;
  
  reports.forEach((report, index) => {
const statusClass = report.status === 'Fulfilled' ? 'positive' : 'warning';

html += `
  <tr style="cursor: default;">
    <td><strong>${index + 1}</strong></td>
    <td>${report.requestNumber}</td>
    <td>${report.from}</td>
    <td>${report.requestDate}</td>
    <td>${report.receiveDate}</td>
    <td class="${statusClass}">${report.status}</td>
    <td>${report.totalItems}</td>
    <td>${report.totalIssuedQty}</td>
    <td>₱${report.totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
  </tr>`;
  });
  
  html += `</tbody></table></div>`;
  document.getElementById('suppliesRecordsTable').innerHTML = html;
}

function renderSuppliesCharts(reports) {
  // Destroy existing charts
  if (suppliesChartsData.status) suppliesChartsData.status.destroy();
  if (suppliesChartsData.value) suppliesChartsData.value.destroy();
  
  // Status Distribution Chart
  const statusCounts = { 'Fulfilled': 0, 'Partial Fulfilled': 0 };
  reports.forEach(r => {
statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  
  const statusCtx = document.getElementById('suppliesStatusChart');
  suppliesChartsData.status = new Chart(statusCtx, {
type: 'doughnut',
data: {
  labels: Object.keys(statusCounts),
  datasets: [{
    data: Object.values(statusCounts),
    backgroundColor: ['#34D399', '#FBBF24'],
    borderColor: '#fff',
    borderWidth: 3
  }]
},
options: {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: { size: 13, weight: '600' },
        padding: 15,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(28, 25, 23, 0.95)',
      padding: 12,
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      borderColor: 'rgb(255, 150, 79)',
      borderWidth: 2,
      callbacks: {
        label: function(context) {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((context.parsed / total) * 100).toFixed(1);
          return ` ${context.label}: ${context.parsed} (${percentage}%)`;
        }
      }
    }
  }
}
  });
  
  // Value Chart
  const labels = reports.map(r => r.requestNumber);
  const values = reports.map(r => r.totalPrice);
  
  const valueCtx = document.getElementById('suppliesValueChart');
  suppliesChartsData.value = new Chart(valueCtx, {
type: 'bar',
data: {
  labels: labels,
  datasets: [{
    label: 'Total Value',
    data: values,
    backgroundColor: 'rgba(255, 150, 79, 0.8)',
    borderColor: 'rgb(255, 150, 79)',
    borderWidth: 2,
    borderRadius: 8
  }]
},
options: {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(28, 25, 23, 0.95)',
      padding: 12,
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      borderColor: 'rgb(255, 150, 79)',
      borderWidth: 2,
      callbacks: {
        label: function(context) {
          return ` Value: ₱${context.parsed.y.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '₱' + value.toLocaleString();
        },
        font: { size: 12, weight: '600' }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      ticks: {
        font: { size: 12, weight: '600' }
      },
      grid: {
        display: false
      }
    }
  }
}
  });
}

// Analytics Functions
// -----------------------------
