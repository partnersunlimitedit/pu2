// Admin Portal (admin.html) — approve/reject/edit/delete member
// listings and manage directory categories. Admin role required.
import { sb, isConfigured, getUser, userIsAdmin, esc, slugify } from './db.js';

const loadingBox = document.getElementById('admin-loading');
const loginForm = document.getElementById('admin-login');
const deniedBox = document.getElementById('admin-denied');
const content = document.getElementById('admin-content');
const tableBody = document.getElementById('admin-table-body');
const adminEmpty = document.getElementById('admin-empty');
const adminCount = document.getElementById('admin-count');
const statsRow = document.getElementById('stats-row');
const statusFilter = document.getElementById('admin-status-filter');
const editForm = document.getElementById('admin-edit-form');
const editMsg = document.getElementById('admin-edit-msg');
const catList = document.getElementById('cat-list');
const catEmpty = document.getElementById('cat-empty');
const catMsg = document.getElementById('cat-msg');

let companies = [];
let categories = [];

function configAlert() {
  document.getElementById('config-alert').innerHTML =
    '<div class="alert-note"><strong>The admin portal is not connected yet.</strong> ' +
    'Follow <code>SUPABASE_SETUP.md</code> to create the database and add your project keys to ' +
    '<code>assets/js/config.js</code>.</div>';
  loadingBox.hidden = true;
}

function show(el, text, type) {
  el.textContent = text;
  el.className = `form-msg is-${type}`;
  el.hidden = false;
}

const badge = (s) => `<span class="badge badge-${s}">${s}</span>`;

/* ---------------- data loading ---------------- */

async function loadCompanies() {
  const { data, error } = await sb()
    .from('companies')
    .select('*, categories ( name ), profiles ( email )')
    .order('created_at', { ascending: false });
  if (error) throw error;
  companies = data || [];
}

async function loadCategories() {
  const { data, error } = await sb().from('categories').select('*').order('name');
  if (error) throw error;
  categories = data || [];
}

/* ---------------- members pane ---------------- */

function renderStats() {
  const count = (s) => companies.filter((c) => c.status === s).length;
  statsRow.innerHTML = [
    ['Pending', count('pending')],
    ['Approved', count('approved')],
    ['Rejected', count('rejected')],
    ['Total', companies.length],
  ].map(([label, n]) => `<div class="stat-chip"><strong>${n}</strong>${label}</div>`).join('');
}

function renderTable() {
  const filter = statusFilter.value;
  const rows = companies.filter((c) => filter === 'all' || c.status === filter);

  adminCount.textContent = `${rows.length} listing${rows.length === 1 ? '' : 's'}`;
  adminEmpty.hidden = rows.length > 0;

  tableBody.innerHTML = rows.map((c) => `
    <tr>
      <td><strong>${esc(c.name)}</strong>${c.description ? `<br><span class="muted">${esc(c.description.slice(0, 80))}${c.description.length > 80 ? '…' : ''}</span>` : ''}</td>
      <td>${c.categories?.name ? esc(c.categories.name) : '<span class="muted">—</span>'}</td>
      <td>${esc([c.city, c.country].filter(Boolean).join(', ')) || '<span class="muted">—</span>'}</td>
      <td>${c.profiles?.email ? esc(c.profiles.email) : '<span class="muted">—</span>'}</td>
      <td>${badge(c.status)}</td>
      <td>
        <div class="row-actions">
          ${c.status !== 'approved' ? `<button class="btn btn-primary btn-sm" data-action="approve" data-id="${c.id}">Approve</button>` : ''}
          ${c.status !== 'rejected' ? `<button class="btn btn-ghost btn-sm" data-action="reject" data-id="${c.id}">Reject</button>` : ''}
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${c.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${c.id}">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

async function refresh() {
  renderStats();
  renderTable();
  renderCategories();
}

tableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const company = companies.find((c) => c.id === id);
  if (!company) return;

  if (btn.dataset.action === 'approve' || btn.dataset.action === 'reject') {
    const status = btn.dataset.action === 'approve' ? 'approved' : 'rejected';
    btn.disabled = true;
    const { error } = await sb().from('companies').update({ status }).eq('id', id);
    if (error) { btn.disabled = false; return alert(error.message); }
    company.status = status;
    await refresh();
  }

  if (btn.dataset.action === 'delete') {
    if (!confirm(`Delete "${company.name}" permanently?`)) return;
    const { error } = await sb().from('companies').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadCompanies();
    await refresh();
  }

  if (btn.dataset.action === 'edit') {
    openEditForm(company);
  }
});

statusFilter.addEventListener('change', renderTable);

/* ---------------- edit form ---------------- */

function openEditForm(c) {
  document.getElementById('a-id').value = c.id;
  document.getElementById('a-name').value = c.name || '';
  document.getElementById('a-status').value = c.status;
  document.getElementById('a-category').value = c.category_id ? String(c.category_id) : '';
  document.getElementById('a-owner').value = c.profiles?.email || '';
  document.getElementById('a-country').value = c.country || '';
  document.getElementById('a-city').value = c.city || '';
  document.getElementById('a-phone').value = c.phone || '';
  document.getElementById('a-email').value = c.email || '';
  document.getElementById('a-website').value = c.website || '';
  document.getElementById('a-description').value = c.description || '';
  editForm.hidden = false;
  editMsg.hidden = true;
  editForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeEditForm() {
  editForm.hidden = true;
}

document.getElementById('btn-edit-cancel').addEventListener('click', closeEditForm);

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = Number(document.getElementById('a-id').value);
  const values = {
    name: document.getElementById('a-name').value.trim(),
    status: document.getElementById('a-status').value,
    category_id: document.getElementById('a-category').value ? Number(document.getElementById('a-category').value) : null,
    country: document.getElementById('a-country').value.trim(),
    city: document.getElementById('a-city').value.trim(),
    phone: document.getElementById('a-phone').value.trim(),
    email: document.getElementById('a-email').value.trim(),
    website: document.getElementById('a-website').value.trim(),
    description: document.getElementById('a-description').value.trim(),
  };
  const btn = editForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  const { error } = await sb().from('companies').update(values).eq('id', id);
  btn.disabled = false;
  if (error) return show(editMsg, error.message, 'error');
  show(editMsg, 'Listing updated.', 'success');
  await loadCompanies();
  renderStats();
  renderTable();
});

/* ---------------- categories pane ---------------- */

function renderCategories() {
  catEmpty.hidden = categories.length > 0;
  catList.innerHTML = categories.map((c) => `
    <li>
      <span>${esc(c.name)}</span>
      <button class="btn btn-ghost btn-sm" data-cat-delete="${c.id}" type="button">Remove</button>
    </li>`).join('');

  const select = document.getElementById('a-category');
  select.innerHTML = '<option value="">None</option>' +
    categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

catList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-cat-delete]');
  if (!btn) return;
  const id = Number(btn.dataset.catDelete);
  const cat = categories.find((c) => c.id === id);
  if (!confirm(`Remove category "${cat?.name}"? Companies using it will keep their listings.`)) return;
  btn.disabled = true;
  const { error } = await sb().from('categories').delete().eq('id', id);
  if (error) { btn.disabled = false; return show(catMsg, error.message, 'error'); }
  await loadCategories();
  renderCategories();
});

document.getElementById('btn-add-cat').addEventListener('click', async (e) => {
  e.preventDefault();
  const input = document.getElementById('new-cat-name');
  const name = input.value.trim();
  if (!name) return;
  const btn = e.currentTarget;
  btn.disabled = true;
  const { error } = await sb().from('categories').insert({ name, slug: slugify(name) });
  btn.disabled = false;
  if (error) return show(catMsg, error.message, 'error');
  input.value = '';
  show(catMsg, 'Category added.', 'success');
  await loadCategories();
  renderCategories();
});

/* ---------------- tabs ---------------- */

document.getElementById('tab-members').addEventListener('click', () => switchPane('members'));
document.getElementById('tab-categories').addEventListener('click', () => switchPane('categories'));

function switchPane(which) {
  document.getElementById('pane-members').hidden = which !== 'members';
  document.getElementById('pane-categories').hidden = which !== 'categories';
  document.getElementById('tab-members').classList.toggle('is-active', which === 'members');
  document.getElementById('tab-categories').classList.toggle('is-active', which === 'categories');
}

/* ---------------- auth gate ---------------- */

async function showDashboard() {
  loadingBox.hidden = true;
  content.hidden = false;
  try {
    await loadCompanies();
    await loadCategories();
  } catch (err) {
    alert(err.message);
    return;
  }
  await refresh();
}

async function init() {
  if (!isConfigured()) return configAlert();

  const user = await getUser();
  if (!user) {
    loadingBox.hidden = true;
    loginForm.hidden = false;
  } else if (!(await userIsAdmin(user))) {
    loadingBox.hidden = true;
    deniedBox.hidden = false;
  } else {
    await showDashboard();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { error } = await sb().auth.signInWithPassword({
    email: document.getElementById('admin-email').value.trim(),
    password: document.getElementById('admin-password').value,
  });
  if (error) return show(document.getElementById('admin-login-msg'), error.message, 'error');
  const user = await getUser();
  if (!(await userIsAdmin(user))) {
    show(document.getElementById('admin-login-msg'), 'This account does not have admin access.', 'error');
    await sb().auth.signOut();
    return;
  }
  loginForm.hidden = true;
  await showDashboard();
});

document.getElementById('btn-denied-signout').addEventListener('click', async () => {
  await sb().auth.signOut();
  window.location.href = 'member-area.html';
});

document.getElementById('btn-admin-signout').addEventListener('click', async () => {
  await sb().auth.signOut();
  window.location.href = 'member-area.html';
});

init();
