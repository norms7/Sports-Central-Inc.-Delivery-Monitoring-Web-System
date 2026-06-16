// Pullout Receiving Report

function addPulloutSI() {
  pulloutSiCounter++;
  const container = document.getElementById('pulloutSiContainer');
  const div = document.createElement('div');
  div.className = 'si-entry'; div.id = `pullout-si-${pulloutSiCounter}`;
  div.innerHTML = `
    <div class="si-entry-header">
      <h3>Pullout Receipt #${pulloutSiCounter}</h3>
      <button type="button" class="btn btn-secondary btn-small" onclick="removePulloutSI(${pulloutSiCounter})">Remove</button>
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

function removePulloutSI(id) {
  if (document.querySelectorAll('#pulloutSiContainer .si-entry').length > 1) document.getElementById(`pullout-si-${id}`).remove();
  else alert('At least one Pullout Receipt is required!');
}

function togglePulloutOtherCategory() {
  const v = document.getElementById('pulloutCategory').value;
  document.getElementById('pulloutOtherCategoryField').classList.toggle('hidden', v!=='Others');
  const inp = document.getElementById('pulloutOtherCategory');
  inp.required = v==='Others';
  if (v!=='Others') inp.value='';
}

function resetPulloutForm() {
  document.getElementById('pulloutDeliveryForm').reset();
  document.getElementById('pulloutSiContainer').innerHTML = '';
  document.getElementById('pulloutOtherCategoryField').classList.add('hidden');
  pulloutSiCounter = 0;
  addPulloutSI();
}

document.getElementById('pulloutDeliveryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const salesInvoices = [];
    document.querySelectorAll('#pulloutSiContainer .si-entry').forEach(entry => {
      const rp = entry.querySelector('[name="retailPrice"]');
      salesInvoices.push({
        trNumber: entry.querySelector('[name="trNumber"]').value,
        drNumber: entry.querySelector('[name="drNumber"]').value,
        siUnits:  parseInt(entry.querySelector('[name="siUnits"]').value, 10),
        actualUnits: parseInt(entry.querySelector('[name="actualUnits"]').value, 10),
        retailPrice: getCurrencyValue(rp)
      });
    });

    const category     = document.getElementById('pulloutCategory').value;
    const finalCategory = category==='Others' ? document.getElementById('pulloutOtherCategory').value : category;
    const deliveryDate  = document.getElementById('pulloutDeliveryDate').value;

    const report = {
      id: Date.now(),
      type: 'pullout',
      salesInvoices,
      brand:      document.getElementById('pulloutBrand').value,
      totalBoxes: parseInt(document.getElementById('pulloutTotalBoxes').value, 10),
      deliveryDate,
      category:   finalCategory,
      remarks:    document.getElementById('pulloutRemarks').value || '',
      createdAt:  new Date().toISOString()
    };

    await dbSaveReport(report);

    document.getElementById('pulloutSuccessMessage').classList.remove('hidden');
    setTimeout(() => document.getElementById('pulloutSuccessMessage').classList.add('hidden'), 2500);
    resetPulloutForm();
  } catch(err) {
    alert('Failed to save: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Report';
  }
});
