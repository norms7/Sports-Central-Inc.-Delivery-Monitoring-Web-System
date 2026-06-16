// Transfer Receiving Report

function addTransferSI() {
  transferSiCounter++;
  const container = document.getElementById('transferSiContainer');
  const div = document.createElement('div');
  div.className = 'si-entry'; div.id = `transfer-si-${transferSiCounter}`;
  div.innerHTML = `
    <div class="si-entry-header">
      <h3>Transfer Receipt #${transferSiCounter}</h3>
      <button type="button" class="btn btn-secondary btn-small" onclick="removeTransferSI(${transferSiCounter})">Remove</button>
    </div>
    <div class="grid">
      <div class="form-group"><label>Transfer Number (TR) *</label><input type="text" name="trNumber" required placeholder="TR Number" /></div>
      <div class="form-group"><label>DR Number *</label><input type="text" name="drNumber" required placeholder="DR Number" /></div>
      <div class="form-group"><label>Number of Units *</label><input type="number" name="siUnits" min="1" required /></div>
      <div class="form-group"><label>Actual Units Delivered *</label><input type="number" name="actualUnits" min="0" required /></div>
      <div class="form-group" style="grid-column:1/-1;"><label>Total Retail Price *</label><input type="text" name="retailPrice" class="currency-input" placeholder="Enter amount" required /></div>
    </div>`;
  container.appendChild(div);
  setupCurrencyInput(div.querySelector('.currency-input'));
}

function removeTransferSI(id) {
  if (document.querySelectorAll('#transferSiContainer .si-entry').length > 1) document.getElementById(`transfer-si-${id}`).remove();
  else alert('At least one Transfer Receipt is required!');
}

function toggleTransferOtherCategory() {
  const v = document.getElementById('transferCategory').value;
  document.getElementById('transferOtherCategoryField').classList.toggle('hidden', v!=='Others');
  const inp = document.getElementById('transferOtherCategory');
  inp.required = v==='Others';
  if (v!=='Others') inp.value='';
}

function resetTransferForm() {
  document.getElementById('transferDeliveryForm').reset();
  document.getElementById('transferSiContainer').innerHTML = '';
  document.getElementById('transferOtherCategoryField').classList.add('hidden');
  transferSiCounter = 0;
  addTransferSI();
}

document.getElementById('transferDeliveryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const salesInvoices = [];
    document.querySelectorAll('#transferSiContainer .si-entry').forEach(entry => {
      const rp = entry.querySelector('[name="retailPrice"]');
      salesInvoices.push({
        trNumber: entry.querySelector('[name="trNumber"]').value,
        drNumber: entry.querySelector('[name="drNumber"]').value,
        siUnits:  parseInt(entry.querySelector('[name="siUnits"]').value, 10),
        actualUnits: parseInt(entry.querySelector('[name="actualUnits"]').value, 10),
        retailPrice: getCurrencyValue(rp)
      });
    });

    const category     = document.getElementById('transferCategory').value;
    const finalCategory = category==='Others' ? document.getElementById('transferOtherCategory').value : category;
    const deliveryDate  = document.getElementById('transferDeliveryDate').value;

    const report = {
      id: Date.now(),
      type: 'transfer',
      salesInvoices,
      brand:      document.getElementById('transferBrand').value,
      totalBoxes: parseInt(document.getElementById('transferTotalBoxes').value, 10),
      deliveryDate,
      category:   finalCategory,
      remarks:    document.getElementById('transferRemarks').value || '',
      createdAt:  new Date().toISOString()
    };

    await dbSaveReport(report);

    document.getElementById('transferSuccessMessage').classList.remove('hidden');
    setTimeout(() => document.getElementById('transferSuccessMessage').classList.add('hidden'), 2500);
    resetTransferForm();
  } catch(err) {
    alert('Failed to save: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Report';
  }
});
