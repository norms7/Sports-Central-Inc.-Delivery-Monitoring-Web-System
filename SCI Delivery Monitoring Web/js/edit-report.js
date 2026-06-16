// Edit Report: password verify & load/save edit form

function requestEditReport(month, year, id) {
  reportToEdit = { month, year, id };
  document.getElementById('passwordModal').classList.remove('hidden');
  document.getElementById('editPassword').value = '';
  document.getElementById('passwordError').classList.add('hidden');
  setTimeout(() => document.getElementById('editPassword')?.focus(), 100);
}

function closePasswordModal()  { document.getElementById('passwordModal').classList.add('hidden'); }
function cancelPasswordModal() { document.getElementById('passwordModal').classList.add('hidden'); reportToEdit = null; }

function verifyPasswordAndEdit() {
  if (document.getElementById('editPassword').value === PASSWORD) {
    closePasswordModal();
    loadEditForm(reportToEdit.month, reportToEdit.year, reportToEdit.id);
  } else {
    document.getElementById('passwordError').classList.remove('hidden');
  }
}

function loadEditForm(month, year, id) {
  const report = allMonthReports.find(r => r.id === id);
  if (!report) { alert('Report not found!'); return; }

  document.getElementById('monthViewPage').classList.add('hidden');
  document.getElementById('editReportPage').classList.remove('hidden');
  reportToEdit = { month, year, id, original: report };

  document.getElementById('editBrand').value        = report.brand;
  document.getElementById('editTotalBoxes').value   = report.totalBoxes;
  document.getElementById('editDeliveryDate').value = report.deliveryDate;
  document.getElementById('editRemarks').value      = report.remarks || '';

  const isCustom = !['Shoes','Bags','Apparel'].includes(report.category);
  if (isCustom) {
    document.getElementById('editCategory').value = 'Others';
    document.getElementById('editOtherCategoryField').classList.remove('hidden');
    document.getElementById('editOtherCategory').value    = report.category;
    document.getElementById('editOtherCategory').required = true;
  } else {
    document.getElementById('editCategory').value = report.category;
    document.getElementById('editOtherCategoryField').classList.add('hidden');
  }

  const container = document.getElementById('editSiContainer');
  container.innerHTML = ''; editSiCounter = 0;

  report.salesInvoices.forEach(si => {
    editSiCounter++;
    const div = document.createElement('div');
    div.className = 'si-entry'; div.id = `edit-si-${editSiCounter}`;
    const price = Number(si.retailPrice).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

    // Support both direct (poNumber/siNumber) and transfer (trNumber/drNumber) in edit form
    const isTransfer = report.type === 'transfer' || report.type === 'pullout';
    div.innerHTML = isTransfer ? `
      <div class="si-entry-header"><h3>Transfer Receipt #${editSiCounter}</h3>
        <button type="button" class="btn btn-secondary btn-small" onclick="removeEditSI(${editSiCounter})">Remove</button></div>
      <div class="grid">
        <div class="form-group"><label>TR Number *</label><input type="text" name="trNumber" required value="${si.trNumber||''}" /></div>
        <div class="form-group"><label>DR Number *</label><input type="text" name="drNumber" required value="${si.drNumber||''}" /></div>
        <div class="form-group"><label>Number of Units *</label><input type="number" name="siUnits" min="1" required value="${si.siUnits}" /></div>
        <div class="form-group"><label>Actual Units *</label><input type="number" name="actualUnits" min="0" required value="${si.actualUnits}" /></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Total Retail Price *</label>
          <input type="text" name="retailPrice" class="currency-input" required value="₱${price}" data-value="${si.retailPrice}" /></div>
      </div>` : `
      <div class="si-entry-header"><h3>Sales Invoice #${editSiCounter}</h3>
        <button type="button" class="btn btn-secondary btn-small" onclick="removeEditSI(${editSiCounter})">Remove</button></div>
      <div class="grid">
        <div class="form-group"><label>Purchase Order (PO)</label><input type="text" name="poNumber" placeholder="Optional" value="${si.poNumber==='N/A'?'':si.poNumber||''}" /></div>
        <div class="form-group"><label>Sales Invoice Number *</label><input type="text" name="siNumber" required value="${si.siNumber||''}" /></div>
        <div class="form-group"><label>Number of Units *</label><input type="number" name="siUnits" min="1" required value="${si.siUnits}" /></div>
        <div class="form-group"><label>Actual Units *</label><input type="number" name="actualUnits" min="0" required value="${si.actualUnits}" /></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Total Retail Price *</label>
          <input type="text" name="retailPrice" class="currency-input" required value="₱${price}" data-value="${si.retailPrice}" /></div>
      </div>`;
    container.appendChild(div);
    setupCurrencyInput(div.querySelector('.currency-input'));
  });
}

function removeEditSI(id) {
  if (document.querySelectorAll('#editSiContainer .si-entry').length > 1) document.getElementById(`edit-si-${id}`).remove();
  else alert('At least one Sales Invoice is required!');
}

function cancelEdit() {
  reportToEdit = null;
  document.getElementById('editReportPage').classList.add('hidden');
  showMonthView(currentMonth);
}

document.getElementById('editDeliveryForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const isTransfer = reportToEdit.original.type === 'transfer' || reportToEdit.original.type === 'pullout';
    const salesInvoices = [];
    document.querySelectorAll('#editSiContainer .si-entry').forEach(entry => {
      const rp = entry.querySelector('[name="retailPrice"]');
      if (isTransfer) {
        salesInvoices.push({
          trNumber: entry.querySelector('[name="trNumber"]').value,
          drNumber: entry.querySelector('[name="drNumber"]').value,
          siUnits:  parseInt(entry.querySelector('[name="siUnits"]').value,10),
          actualUnits: parseInt(entry.querySelector('[name="actualUnits"]').value,10),
          retailPrice: getCurrencyValue(rp)
        });
      } else {
        salesInvoices.push({
          poNumber: entry.querySelector('[name="poNumber"]').value || 'N/A',
          siNumber: entry.querySelector('[name="siNumber"]').value,
          siUnits:  parseInt(entry.querySelector('[name="siUnits"]').value,10),
          actualUnits: parseInt(entry.querySelector('[name="actualUnits"]').value,10),
          retailPrice: getCurrencyValue(rp)
        });
      }
    });

    const category     = document.getElementById('editCategory').value;
    const finalCategory = category==='Others' ? document.getElementById('editOtherCategory').value : category;
    const deliveryDate  = document.getElementById('editDeliveryDate').value;

    const updatedReport = {
      id:           reportToEdit.id,
      type:         reportToEdit.original.type,
      salesInvoices,
      brand:        document.getElementById('editBrand').value,
      totalBoxes:   parseInt(document.getElementById('editTotalBoxes').value,10),
      deliveryDate,
      category:     finalCategory,
      remarks:      document.getElementById('editRemarks').value || '',
      createdAt:    reportToEdit.original.createdAt,
      updatedAt:    new Date().toISOString()
    };

    await dbUpdateReport(updatedReport);

    // Update local allMonthReports cache
    const idx = allMonthReports.findIndex(r => r.id === reportToEdit.id);
    if (idx !== -1) allMonthReports[idx] = updatedReport;

    document.getElementById('editSuccessMessage').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('editSuccessMessage').classList.add('hidden');
      const date = new Date(deliveryDate);
      currentMonth = MONTHS[date.getMonth()];
      currentYear  = date.getFullYear();
      cancelEdit();
    }, 1500);
  } catch(err) {
    alert('Failed to save: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
});
