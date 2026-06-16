// Monthly Analytics

let analyticsCharts = {};

function showAnalytics() {
  document.getElementById('monthViewPage').classList.add('hidden');
  document.getElementById('analyticsPage').classList.remove('hidden');
  
  // Update title
  document.getElementById('analyticsTitle').textContent = `📊 ${currentMonth} ${currentYear} Analytics`;
  document.getElementById('analyticsSubtitle').textContent = `Visual insights for ${currentMonth} ${currentYear}`;
  
  // Generate analytics
  generateAnalytics();
}

function backFromAnalytics() {
  document.getElementById('analyticsPage').classList.add('hidden');
  document.getElementById('monthViewPage').classList.remove('hidden');
}

function generateAnalytics() {
  // Destroy existing charts
  Object.values(analyticsCharts).forEach(chart => {
    if (chart) chart.destroy();
  });
  analyticsCharts = {};

  const reports = allMonthReports;
  
  // Reset all metrics to zero
  document.getElementById('metricDeliveries').textContent = '0';
  document.getElementById('metricUnits').textContent = '0';
  document.getElementById('metricVariance').textContent = '0';
  document.getElementById('metricVariance').style.color = '';
  document.getElementById('metricValue').textContent = '₱0.00';
  
  if (reports.length === 0) {
    // Clear all chart canvases
    const chartIds = ['brandChart', 'categoryChart', 'varianceChart', 'valueChart', 'typeChart'];
    chartIds.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    
    // Clear top performers
    document.getElementById('topPerformers').innerHTML = '<div class="empty">No data available for this month</div>';
    
    return;
  }

  // Calculate metrics
  let totalDeliveries = reports.length;
  let totalUnits = 0;
  let totalVariance = 0;
  let totalValue = 0;
  
  // Initialize ALL brands with 0 (so they all show in charts)
  let brandData = {};
  BRANDS.forEach(brand => {
    brandData[brand] = 0;
  });
  
  let categoryData = {};
  let typeData = { direct: 0, transfer: 0, pullout: 0 };
  
  // Initialize variance and value for all brands
  let brandVariance = {};
  let brandValue = {};
  BRANDS.forEach(brand => {
    brandVariance[brand] = { total: 0, units: 0 };
    brandValue[brand] = 0;
  });
  
  let accuracyData = [];

  reports.forEach(report => {
    // Brand counts
    brandData[report.brand] = (brandData[report.brand] || 0) + 1;
    
    // Category counts
    categoryData[report.category] = (categoryData[report.category] || 0) + 1;
    
    // Type counts
    const type = report.type || 'direct';
    typeData[type]++;
    
    // Calculate totals per report
    let reportUnits = 0;
    let reportActual = 0;
    let reportValue = 0;
    
    report.salesInvoices.forEach(si => {
      reportUnits += si.siUnits;
      reportActual += si.actualUnits;
      reportValue += Number(si.retailPrice || 0);
    });
    
    const variance = reportActual - reportUnits;
    
    totalUnits += reportUnits;
    totalVariance += variance;
    totalValue += reportValue;
    
    // Brand variance
    if (!brandVariance[report.brand]) {
      brandVariance[report.brand] = { total: 0, units: 0 };
    }
    brandVariance[report.brand].total += variance;
    brandVariance[report.brand].units += reportUnits;
    
    // Brand value
    brandValue[report.brand] = (brandValue[report.brand] || 0) + reportValue;
    
    // Accuracy tracking
    const accuracy = reportUnits > 0 ? ((reportActual / reportUnits) * 100) : 100;
    accuracyData.push({
      brand: report.brand,
      date: report.deliveryDate,
      accuracy: accuracy,
      variance: variance
    });
  });

  // Update metric cards
  document.getElementById('metricDeliveries').textContent = totalDeliveries;
  document.getElementById('metricUnits').textContent = totalUnits.toLocaleString();
  document.getElementById('metricVariance').textContent = (totalVariance > 0 ? '+' : '') + totalVariance.toLocaleString();
  document.getElementById('metricVariance').style.color = totalVariance >= 0 ? '#16a34a' : '#ef4444';
  document.getElementById('metricValue').textContent = '₱' + totalValue.toLocaleString('en-US', {minimumFractionDigits: 2});

  // Generate charts
  createBrandChart(brandData);
  createCategoryChart(categoryData);
  createVarianceChart(brandVariance, reports);
  createValueChart(brandValue);
  createTypeChart(typeData);
  createTopPerformers(accuracyData, brandVariance);
}

function createBrandChart(data) {
  const ctx = document.getElementById('brandChart');
  const labels = Object.keys(data);
  const values = Object.values(data);
  
  // Light, vibrant colors that match the orange theme
  const brandColors = {
    'Nike': '#FF6B00',        // Nike Orange
    'Adidas': '#4A90E2',      // Adidas Blue
    'Under Armour': '#34D399', // UA Green
    'Reebok': '#EF4444',      // Reebok Red
    'Puma': '#FBBF24',        // Puma Gold/Yellow
    'Jordan': '#DC2626',      // Jordan Red
    'New Balance': '#8B5CF6'  // New Balance Purple
  };
  
  // Map colors based on brand names
  const colors = labels.map(brand => brandColors[brand] || 'rgb(255, 150, 79)');

  analyticsCharts.brand = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Deliveries',
        data: values,
        backgroundColor: 'rgba(255, 150, 79, 0.1)',
        borderColor: 'rgb(255, 150, 79)',
        borderWidth: 3,
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 10,
        tension: 0.4,
        fill: true
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
          displayColors: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: function(context) {
            const maxValue = Math.max(...context.chart.data.datasets[0].data);
            return Math.max(10, maxValue + 2); // Minimum 10, or max value + 2
          },
          ticks: {
            precision: 0,
            font: { size: 12, weight: '600' },
            stepSize: 1
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

function createCategoryChart(data) {
  const ctx = document.getElementById('categoryChart');
  let labels = Object.keys(data);
  const values = Object.values(data);
  
  // Replace "Shoes, Bags, Apparel" with "Others/Mix"
  labels = labels.map(label => {
    if (label.toLowerCase().includes('shoes') && label.toLowerCase().includes('bags') && label.toLowerCase().includes('apparel')) {
      return 'Others/Mix';
    }
    if (label === 'Shoes, Bags, Apparel') {
      return 'Others/Mix';
    }
    return label;
  });
  
  // Light, vibrant category colors
  const categoryColors = {
    'Shoes': '#FF6B00',           // Orange
    'Bags': '#EF4444',            // Red
    'Apparel': '#8B5CF6',         // Purple
    'Shoes and Apparel': '#F59E0B', // Amber
    'Others/Mix': '#FF8C00',      // Dark Orange
    'Accessories': '#3B82F6'      // Blue
  };
  
  // Map colors based on category names, with fallbacks
  const colors = labels.map(label => categoryColors[label] || 'rgb(255, 150, 79)');

  analyticsCharts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
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
}

function createVarianceChart(brandVariance, reports) {
  const container = document.getElementById('varianceDetailTable');
  if (!container) return;

  // Flatten all reports → all SI rows with variance detail
  const rows = [];
  reports.forEach(report => {
    report.salesInvoices.forEach(si => {
      const variance = si.actualUnits - si.siUnits;
      rows.push({
        date:       report.deliveryDate,
        brand:      report.brand,
        poTr:       si.poNumber || si.trNumber || '—',
        siDr:       si.siNumber || si.drNumber || '—',
        siUnits:    si.siUnits,
        actual:     si.actualUnits,
        variance:   variance,
        retailPrice: Number(si.retailPrice || 0),
        category:   report.category || '—',
        remarks:    report.remarks || ''
      });
    });
  });

  if (rows.length === 0) {
    container.innerHTML = '<div class="empty">No variance data available.</div>';
    return;
  }

  // Sort by absolute variance descending — biggest discrepancies on top
  rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  // Brand summary rows for the top header
  const brandSummaryHtml = Object.keys(brandVariance).map(brand => {
    const bv = brandVariance[brand];
    const acc = bv.units > 0 ? Math.max(0, 100 - (Math.abs(bv.total) / bv.units) * 100) : 100;
    const vColor = bv.total >= 0 ? '#16a34a' : '#ef4444';
    const accClass = acc >= 95 ? 'acc-good' : acc >= 80 ? 'acc-ok' : 'acc-bad';
    return `
      <div class="variance-brand-chip">
        <span class="vbc-brand">${brand}</span>
        <span class="vbc-variance" style="color:${vColor};">${bv.total >= 0 ? '+' : ''}${bv.total}</span>
        <span class="variance-acc-badge ${accClass}">${acc.toFixed(1)}%</span>
      </div>`;
  }).join('');

  // Build the detail table
  let tableHtml = `
    <div class="variance-brand-summary">${brandSummaryHtml}</div>
    <div class="variance-table-wrapper">
      <table class="variance-detail-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Brand</th>
            <th>PO / TR No.</th>
            <th>SI / DR No.</th>
            <th>SI Units</th>
            <th>Actual</th>
            <th>Variance</th>
            <th>Accuracy</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>`;

  rows.forEach((row, i) => {
    const vSign   = row.variance >= 0 ? '+' : '';
    const vClass  = row.variance > 0 ? 'vt-positive' : row.variance < 0 ? 'vt-negative' : 'vt-zero';
    const acc     = row.siUnits > 0 ? Math.max(0, 100 - (Math.abs(row.variance) / row.siUnits) * 100) : 100;
    const accClass = acc >= 95 ? 'acc-good' : acc >= 80 ? 'acc-ok' : 'acc-bad';
    const remarksBadge = row.remarks
      ? `<span class="vt-remarks" title="${row.remarks.replace(/"/g, '&quot;')}">💬 ${row.remarks}</span>`
      : '<span style="color:#ccc;">—</span>';

    tableHtml += `
      <tr>
        <td><strong>${i + 1}</strong></td>
        <td>${row.date}</td>
        <td>${row.brand}</td>
        <td>${row.poTr}</td>
        <td>${row.siDr}</td>
        <td>${row.siUnits}</td>
        <td>${row.actual}</td>
        <td class="${vClass}"><strong>${vSign}${row.variance}</strong></td>
        <td><span class="variance-acc-badge ${accClass}">${acc.toFixed(1)}%</span></td>
        <td>${remarksBadge}</td>
      </tr>`;
  });

  tableHtml += `</tbody></table></div>`;
  container.innerHTML = tableHtml;
}


function createValueChart(data) {
  const ctx = document.getElementById('valueChart');
  const labels = Object.keys(data);
  const values = Object.values(data);
  
  // Light, vibrant colors that match the orange theme (same as brand chart)
  const brandColors = {
    'Nike': '#FF6B00',        // Nike Orange
    'Adidas': '#4A90E2',      // Adidas Blue
    'Under Armour': '#34D399', // UA Green
    'Reebok': '#EF4444',      // Reebok Red
    'Puma': '#FBBF24',        // Puma Gold/Yellow
    'Jordan': '#DC2626',      // Jordan Red
    'New Balance': '#8B5CF6'  // New Balance Purple
  };
  
  // Map colors based on brand names
  const colors = labels.map(brand => brandColors[brand] || 'rgb(255, 150, 79)');
  
  analyticsCharts.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Retail Value',
        data: values,
        backgroundColor: colors,
        borderColor: colors,
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

function createTypeChart(data) {
  const ctx = document.getElementById('typeChart');
  const labels = ['Direct Delivery', 'Transfer Receiving', 'Pullout Receiving'];
  const values = [data.direct || 0, data.transfer || 0, data.pullout || 0];
  
  const colors = [
    'rgb(255, 150, 79)',
    'rgb(59, 130, 246)',
    'rgb(168, 85, 247)'
  ];

  analyticsCharts.type = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
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
}

function createTopPerformers(accuracyData, brandVariance) {
  const container = document.getElementById('topPerformers');
  
  // Calculate accuracy by brand
  const brandAccuracy = {};
  Object.keys(brandVariance).forEach(brand => {
    const totalVariance = Math.abs(brandVariance[brand].total);
    const totalUnits = brandVariance[brand].units;
    const accuracyPercentage = totalUnits > 0 ? 100 - ((totalVariance / totalUnits) * 100) : 100;
    brandAccuracy[brand] = {
      accuracy: accuracyPercentage,
      variance: brandVariance[brand].total,
      units: totalUnits
    };
  });
  
  // Sort by accuracy
  const sorted = Object.entries(brandAccuracy)
    .sort((a, b) => b[1].accuracy - a[1].accuracy);
  
  // Generate HTML
  let html = '';
  sorted.forEach(([brand, data], index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    
    html += `
      <div class="performer-item">
        <div class="performer-rank">${medal}</div>
        <div class="performer-info">
          <div class="performer-brand">${brand}</div>
          <div class="performer-details">
            ${data.units} units • Variance: ${data.variance > 0 ? '+' : ''}${data.variance}
          </div>
        </div>
        <div class="performer-score">${data.accuracy.toFixed(1)}%</div>
      </div>
    `;
  });
  
  container.innerHTML = html || '<div class="empty">No data available</div>';
}


