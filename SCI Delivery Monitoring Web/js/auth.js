// Auth: login, logout, requireAuth

// Session stored in sessionStorage (stays within tab, cleared on close)
function _authGet()   { try { return sessionStorage.getItem('authenticated'); } catch(e){ return localStorage.getItem('authenticated'); } }
function _authSet()   { try { sessionStorage.setItem('authenticated','1');    } catch(e){ localStorage.setItem('authenticated','1'); } }
function _authClear() { try { sessionStorage.removeItem('authenticated');      } catch(e){ localStorage.removeItem('authenticated'); } }

const PAGE = window.location.pathname.split('/').pop() || 'index.html';

function login() {
  const username = document.getElementById('username')?.value || '';
  const password = document.getElementById('password')?.value || '';
  if (username === 'dssnl' && password === PASSWORD) {
    _authSet();
    window.location.href = 'dashboard.html';
  } else {
    document.getElementById('loginError')?.classList.remove('hidden');
  }
}

function requireAuth() {
  if (!_authGet() && PAGE !== 'index.html') window.location.href = 'index.html';
}

function showDashboard()  { window.location.href = 'dashboard.html'; }
function showArchives()   { window.location.href = 'archives.html'; }

function showDeliveryForm(type) {
  currentDeliveryType = type;
  const map = { direct:'direct.html', transfer:'transfer.html', pullout:'pullout.html', supplies:'supplies.html' };
  if (map[type]) window.location.href = map[type];
}

function logout() { _authClear(); window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', async function () {
  requireAuth();
  loadTheme();

  // ── Login page ──
  document.getElementById('password')?.addEventListener('keypress', e => { if(e.key==='Enter') login(); });
  document.getElementById('username')?.addEventListener('keypress', e => { if(e.key==='Enter') login(); });

  // ── Archives page modals ──
  document.getElementById('editPassword')?.addEventListener('keypress', e => {
    if (e.key==='Enter') { e.preventDefault(); verifyPasswordAndEdit(); }
  });
  document.getElementById('passwordModal')?.addEventListener('click', e => {
    if (e.target===document.getElementById('passwordModal')) cancelPasswordModal();
  });
  document.getElementById('viewReportModal')?.addEventListener('click', e => {
    if (e.target===document.getElementById('viewReportModal')) closeViewModal();
  });
  document.getElementById('importPasswordModal')?.addEventListener('click', e => {
    if (e.target===document.getElementById('importPasswordModal')) cancelImportPasswordModal();
  });

  // ── Archives page: load year dropdown + grid ──
  if (document.getElementById('yearSelect')) {
    await populateYearDropdown();
    await loadMonthGrid();
  }
});
