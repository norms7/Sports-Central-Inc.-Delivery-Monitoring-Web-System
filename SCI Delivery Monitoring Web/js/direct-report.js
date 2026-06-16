// Direct Delivery Report

function addSI() {
  siCounter++;
  const container = document.getElementById('siContainer');
  const div = document.createElement('div');
  div.className = 'si-entry'; div.id = `si-${siCounter}`;
  div.innerHTML = `
    <div class="si-entry-header">
      <h3>Sales Invoice #${siCounter}</h3>
      <button type="button" class="btn btn-secondary btn-small" onclick="removeSI(${siCounter})">Remove</button>
    </div>
    <div class="grid">
      <div class="form-group"><label>Purchase Order (PO)</label><input type="text" name="poNumber" placeholder="Optional" /></div>
      <div class="form-group"><label>Sales Invoice Number *</label><input type="text" name="siNumber" required /></div>
      <div class="form-group"><label>Number of Units *</label><input type="number" name="siUnits" min="1" required /></div>
      <div class="form-group"><label>Actual Units Delivered *</label><input type="number" name="actualUnits" min="0" required /></div>
      <div class="form-group" style="grid-column:1/-1;"><label>Total Retail Price *</label><input type="text" name="retailPrice" class="currency-input" placeholder="Enter amount" required /></div>
    </div>`;
  container.appendChild(div);
  setupCurrencyInput(div.querySelector('.currency-input'));
}

function removeSI(id) {
  if (document.querySelectorAll('.si-entry').length > 1) document.getElementById(`si-${id}`).remove();
  else alert('At least one Sales Invoice is required!');
}

document.getElementById('deliveryForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const salesInvoices = [];
    document.querySelectorAll('#siContainer .si-entry').forEach(entry => {
      const rp = entry.querySelector('[name="retailPrice"]');
      salesInvoices.push({
        poNumber: entry.querySelector('[name="poNumber"]').value || 'N/A',
        siNumber: entry.querySelector('[name="siNumber"]').value,
        siUnits:  parseInt(entry.querySelector('[name="siUnits"]').value, 10),
        actualUnits: parseInt(entry.querySelector('[name="actualUnits"]').value, 10),
        retailPrice: getCurrencyValue(rp)
      });
    });

    const category     = document.getElementById('category').value;
    const finalCategory = category==='Others' ? document.getElementById('otherCategory').value : category;
    const deliveryDate  = document.getElementById('deliveryDate').value;

    const report = {
      id: Date.now(),
      type: 'direct',
      salesInvoices,
      brand:        document.getElementById('brand').value,
      totalBoxes:   parseInt(document.getElementById('totalBoxes').value, 10),
      deliveryDate,
      category:     finalCategory,
      remarks:      document.getElementById('remarks').value || '',
      createdAt:    new Date().toISOString()
    };

    await dbSaveReport(report);

    document.getElementById('successMessage').classList.remove('hidden');
    setTimeout(() => document.getElementById('successMessage').classList.add('hidden'), 2500);
    resetForm();
  } catch(err) {
    alert('Failed to save: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Report';
  }
});

function resetForm() {
  document.getElementById('deliveryForm').reset();
  document.getElementById('siContainer').innerHTML = '';
  document.getElementById('otherCategoryField').classList.add('hidden');
  siCounter = 0;
  addSI();
}
