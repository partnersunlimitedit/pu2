// Member Directory (members.html) — public listing of approved members.
import { sb, isConfigured, esc, initials } from './db.js';

const grid = document.getElementById('directory-grid');
const empty = document.getElementById('directory-empty');
const loading = document.getElementById('directory-loading');
const filtersBar = document.getElementById('filters');
const searchInput = document.getElementById('filter-search');
const categorySelect = document.getElementById('filter-category');
const countrySelect = document.getElementById('filter-country');
const countLabel = document.getElementById('filters-count');

let companies = [];
let categories = [];

function configAlert() {
  const box = document.getElementById('config-alert');
  box.innerHTML = '<div class="alert-note"><strong>Member directory is not connected yet.</strong> ' +
    'Follow <code>SUPABASE_SETUP.md</code> to create the database and add your project keys to ' +
    '<code>assets/js/config.js</code>.</div>';
  loading.hidden = true;
}

const ICONS = {
  pin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  phone: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 1 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  mail: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
};

function cardHTML(c) {
  const logo = c.logo_url
    ? `<img class="dir-logo" src="${esc(c.logo_url)}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : '';
  const category = c.categories?.name ? `<span class="chip">${esc(c.categories.name)}</span>` : '';
  const location = [c.city, c.country].filter(Boolean).join(', ');
  const website = c.website
    ? `<a class="btn btn-outline btn-sm" href="${esc(c.website)}" target="_blank" rel="noopener">Visit Website</a>`
    : '';
  const emailRow = c.email
    ? `<li>${ICONS.mail}<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>`
    : '';
  const phoneRow = c.phone
    ? `<li>${ICONS.phone}<a href="tel:${esc(c.phone.replace(/\s+/g, ''))}">${esc(c.phone)}</a></li>`
    : '';
  const locationRow = location ? `<li>${ICONS.pin}<span>${esc(location)}</span></li>` : '';

  return `<article class="dir-card">
    <div class="dir-card-head">
      <span class="avatar" aria-hidden="true">${initials(c.name)}</span>
      ${logo}
      <div>
        <h3>${esc(c.name)}</h3>
        ${category}
      </div>
    </div>
    ${c.description ? `<p class="dir-desc">${esc(c.description)}</p>` : ''}
    <ul class="dir-meta">
      ${locationRow}
      ${phoneRow}
      ${emailRow}
    </ul>
    ${website}
  </article>`;
}

function currentFilter() {
  const q = searchInput.value.trim().toLowerCase();
  return {
    q,
    category: categorySelect.value,
    country: countrySelect.value,
  };
}

function render() {
  const { q, category, country } = currentFilter();
  const visible = companies.filter((c) => {
    if (category && String(c.category_id) !== category) return false;
    if (country && c.country !== country) return false;
    if (q) {
      const hay = [c.name, c.city, c.country, c.description, c.categories?.name]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  grid.innerHTML = visible.map(cardHTML).join('');
  empty.hidden = visible.length > 0;
  countLabel.textContent = `${visible.length} member${visible.length === 1 ? '' : 's'}`;
}

function populateFilters() {
  const cats = [...new Map(categories.map((c) => [c.id, c])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  categorySelect.innerHTML = '<option value="">All categories</option>' +
    cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

  const countries = [...new Set(companies.map((c) => c.country).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  countrySelect.innerHTML = '<option value="">All countries</option>' +
    countries.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

async function init() {
  if (!isConfigured()) return configAlert();

  const [{ data: catData, error: catErr }, { data: compData, error: compErr }] = await Promise.all([
    sb().from('categories').select('id, name').order('name'),
    sb().from('companies').select('*, categories ( name )').eq('status', 'approved').order('name'),
  ]);

  loading.hidden = true;
  if (catErr || compErr) {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.querySelector('strong').textContent = 'The directory could not be loaded.';
    empty.querySelector('.muted').textContent = (catErr || compErr).message;
    return;
  }

  categories = catData || [];
  companies = compData || [];

  populateFilters();
  filtersBar.hidden = false;
  render();

  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(render, 150);
  });
  categorySelect.addEventListener('change', render);
  countrySelect.addEventListener('change', render);
}

init();
