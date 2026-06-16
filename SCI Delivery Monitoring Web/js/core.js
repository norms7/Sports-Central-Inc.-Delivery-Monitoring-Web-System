// Core: constants, globals, theme, currency helpers
// localStorage is NO LONGER used for reports — all data goes through db.js

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const BRANDS = ['Nike','Adidas','Under Armour','Reebok','Puma','Jordan','New Balance'];
const PASSWORD = '1234'; // System password

let siCounter        = 0;
let transferSiCounter = 0;
let pulloutSiCounter  = 0;
let editSiCounter     = 0;
let currentMonth      = '';
let currentYear       = new Date().getFullYear();
let selectedBrandFilter = 'All';
let searchQuery       = '';
let dateFilter        = '';
let allMonthReports   = [];
let reportToEdit      = null;
let currentDeliveryType = 'direct';

// ── Dark Mode ──────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme); // theme preference stays in localStorage — fine

  const toggle = document.querySelector('.theme-toggle');
  const rect = toggle.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top  + rect.height / 2;
  const size = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) * 2.5;

  const overlay = document.getElementById('themeTransitionOverlay');
  const circle  = document.createElement('div');
  circle.className = 'theme-transition-circle';
  circle.style.cssText = `
    background: ${newTheme === 'dark' ? 'rgba(28,25,23,0.3)' : 'rgba(250,250,250,0.3)'};
    width:${size}px; height:${size}px;
    left:${x}px; top:${y}px;
    margin-left:-${size/2}px; margin-top:-${size/2}px;
    opacity:0.8;`;
  overlay.appendChild(circle);
  circle.offsetHeight;
  requestAnimationFrame(() => circle.classList.add('active'));
  setTimeout(() => {
    circle.style.opacity = '0';
    setTimeout(() => circle.parentNode && overlay.removeChild(circle), 400);
  }, 300);
  toggle.style.transform = 'scale(0.8) rotate(360deg)';
  setTimeout(() => { toggle.style.transform = ''; }, 300);
}

function loadTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

// ── Currency ───────────────────────────────────────────────
function formatCurrency(input) {
  let value = input.value.replace(/[^\d.]/g, '');
  if (!value || parseFloat(value) === 0) { input.value = ''; input.removeAttribute('data-value'); return; }
  const parts = value.split('.');
  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
  if (parts.length > 1) { parts[1] = parts[1].substring(0, 2); value = parts.join('.'); }
  const num = parseFloat(value);
  input.value = '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  input.setAttribute('data-value', value);
}

function getCurrencyValue(input) {
  const dv = input.getAttribute('data-value');
  if (dv) return parseFloat(dv) || 0;
  return parseFloat(input.value.replace(/[^\d.]/g, '')) || 0;
}

function setupCurrencyInput(input) {
  input.addEventListener('blur', function() {
    if (this.value && this.value.replace(/[^\d.]/g, '') !== '') formatCurrency(this);
  });
  input.addEventListener('focus', function() {
    const raw = this.getAttribute('data-value');
    if (raw) this.value = raw;
    else if (this.value.startsWith('₱')) this.value = this.value.replace(/[^\d.]/g, '');
  });
  input.addEventListener('keypress', function(e) {
    const ch = String.fromCharCode(e.which);
    if (!/[\d.]/.test(ch)) e.preventDefault();
    if (ch === '.' && this.value.includes('.')) e.preventDefault();
  });
}

// ── Year helpers (now DB-driven, but keep UI helpers) ──────
function getSelectedYear() {
  const el = document.getElementById('yearSelect');
  return el ? parseInt(el.value || currentYear, 10) : currentYear;
}

async function populateYearDropdown() {
  const yearSelect = document.getElementById('yearSelect');
  if (!yearSelect) return;
  try {
    const years = await dbGetYears();
    yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.value = String(years.includes(currentYear) ? currentYear : years[0]);
  } catch(e) {
    console.error('populateYearDropdown error:', e);
  }
}

async function populateAnnualYearDropdown() {
  const yearSelect = document.getElementById('annualYearSelect');
  if (!yearSelect) return;
  try {
    const years = await dbGetYears();
    yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.value = String(years.includes(currentYear) ? currentYear : years[0]);
  } catch(e) {
    console.error('populateAnnualYearDropdown error:', e);
  }
}
