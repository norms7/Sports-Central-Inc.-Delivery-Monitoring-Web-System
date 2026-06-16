// ============================================================
// auth.js — Multi-account authentication
// Uses bcryptjs (CDN) to verify passwords against hashed values.
// Session stored in sessionStorage: cleared when tab closes.
// ============================================================

// ── Account registry ────────────────────────────────────────
// Passwords are bcrypt hashes of '1234' (cost factor 10).
// Generated with: bcrypt.hashSync('1234', 10)

// ── Session helpers ─────────────────────────────────────────
function _sessionGet() {
  try {
    return JSON.parse(sessionStorage.getItem("sci_user"));
  } catch (e) {
    return null;
  }
}
function _sessionSet(user) {
  try {
    sessionStorage.setItem("sci_user", JSON.stringify(user));
  } catch (e) {}
}
function _sessionClear() {
  try {
    sessionStorage.removeItem("sci_user");
  } catch (e) {}
}

/** Returns the currently logged-in user object or null. */
function getCurrentUser() {
  return _sessionGet();
}

/** Returns the branch_id (username) of the current user, used for DB filtering. */
function getCurrentBranchId() {
  const u = _sessionGet();
  return u ? u.branchId : null;
}

// ── Login ───────────────────────────────────────────────────
async function login() {
  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');
  const errorEl    = document.getElementById('loginError');
  const btnEl      = document.querySelector('.btn-primary');

  const username = (usernameEl?.value || '').trim().toLowerCase();
  const password = passwordEl?.value || '';

  if (!username || !password) {
    if (errorEl) { errorEl.textContent = 'Please enter username and password.'; errorEl.classList.remove('hidden'); }
    return;
  }

  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳ Verifying...'; }
  if (errorEl) errorEl.classList.add('hidden');

  try {
    // Fetch user from Supabase
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=username,branch_id,branch_name,branch_code,label,password_hash`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await res.json();
    const account = rows?.[0];

    if (!account) {
      if (errorEl) { errorEl.textContent = 'Invalid username or password.'; errorEl.classList.remove('hidden'); }
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = '🔐 Login'; }
      return;
    }

    const match = await bcrypt.compare(password, account.password_hash);
    if (match) {
      _sessionSet({
        username:   account.username,
        branchId:   account.branch_id,
        branchName: account.branch_name,
        branchCode: account.branch_code,
        label:      account.label
      });
      window.location.href = 'dashboard.html';
    } else {
      if (errorEl) { errorEl.textContent = 'Invalid username or password.'; errorEl.classList.remove('hidden'); }
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = '🔐 Login'; }
    }
  } catch(err) {
    console.error('Login error:', err);
    if (errorEl) { errorEl.textContent = 'Login error. Please try again.'; errorEl.classList.remove('hidden'); }
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '🔐 Login'; }
  }
}

// ── Auth guard ──────────────────────────────────────────────
const PAGE = window.location.pathname.split("/").pop() || "index.html";

function requireAuth() {
  if (!_sessionGet() && PAGE !== "index.html") {
    window.location.href = "index.html";
  }
}

// ── Logout ──────────────────────────────────────────────────
function logout() {
  _sessionClear();
  window.location.href = "index.html";
}

// ── Apply branch info to current page ───────────────────────
function applyBranchInfo() {
  const user = _sessionGet();
  if (!user) return;

  // Update <title>
  const prefix = document.title.split("|")[0].trim(); // e.g. "Dashboard"
  document.title = prefix ? `${prefix} | ${user.label}` : user.label;

  // Update all elements with data-branch-label
  document.querySelectorAll("[data-branch-label]").forEach((el) => {
    el.textContent = user.label;
  });

  // Update all elements with data-branch-name
  document.querySelectorAll("[data-branch-name]").forEach((el) => {
    el.textContent = user.branchName;
  });

  // Update all elements with data-branch-code
  document.querySelectorAll("[data-branch-code]").forEach((el) => {
    el.textContent = user.branchCode;
  });
}

// ── Navigation helpers (unchanged API) ─────────────────────
function showDashboard() {
  window.location.href = "dashboard.html";
}
function showArchives() {
  window.location.href = "archives.html";
}

function showDeliveryForm(type) {
  currentDeliveryType = type;
  const map = {
    direct: "direct.html",
    transfer: "transfer.html",
    pullout: "pullout.html",
    supplies: "supplies.html",
  };
  if (map[type]) window.location.href = map[type];
}

// ── DOMContentLoaded ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function () {
  requireAuth();
  loadTheme();
  applyBranchInfo();

  // ── Login page ──
  document.getElementById("password")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
  document.getElementById("username")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });

  // ── Archives page modals ──
  document.getElementById("editPassword")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyPasswordAndEdit();
    }
  });
  document.getElementById("passwordModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("passwordModal"))
      cancelPasswordModal();
  });
  document.getElementById("viewReportModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("viewReportModal"))
      closeViewModal();
  });
  document
    .getElementById("importPasswordModal")
    ?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("importPasswordModal"))
        cancelImportPasswordModal();
    });

  // ── Archives page: load year dropdown + grid ──
  if (document.getElementById("yearSelect")) {
    await populateYearDropdown();
    await loadMonthGrid();
  }
});