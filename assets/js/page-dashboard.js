// Member Dashboard (member-dashboard.html) — a member manages their
// own company listing (one listing per account).
import { sb, isConfigured, getUser, esc } from './db.js';

const loadingBox = document.getElementById('dash-loading');
const content = document.getElementById('dash-content');
const form = document.getElementById('form-company');
const msg = document.getElementById('company-msg');
const statusBadge = document.getElementById('company-status');
const heading = document.getElementById('dash-heading');
const note = document.getElementById('dash-note');
const categorySelect = document.getElementById('c-category');

let user = null;
let myCompany = null;
let categories = [];

const STATUS_META = {
  pending: {
    className: 'badge badge-pending',
    text: 'Pending approval',
    note: 'Your listing is waiting for approval by the network administrator. It becomes visible in the member directory once approved.',
  },
  approved: {
    className: 'badge badge-approved',
    text: 'Approved',
    note: 'Your listing is live in the <a href="members.html">member directory</a>. Changes you save are published immediately.',
  },
  rejected: {
    className: 'badge badge-rejected',
    text: 'Rejected',
    note: 'Your listing was rejected. Please review your details below — saving will re-submit it for approval.',
  },
};

function configAlert() {
  document.getElementById('config-alert').innerHTML =
    '<div class="alert-note"><strong>The member area is not connected yet.</strong> ' +
    'Follow <code>SUPABASE_SETUP.md</code> to create the database and add your project keys to ' +
    '<code>assets/js/config.js</code>.</div>';
  loadingBox.hidden = true;
}

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = `form-msg is-${type}`;
  msg.hidden = false;
}

function setStatus(status) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  statusBadge.className = meta.className;
  statusBadge.textContent = meta.text;
  note.innerHTML = meta.note;
}

function fillForm() {
  const c = myCompany || {};
  document.getElementById('c-name').value = c.name || '';
  document.getElementById('c-country').value = c.country || '';
  document.getElementById('c-city').value = c.city || '';
  document.getElementById('c-address').value = c.address || '';
  document.getElementById('c-phone').value = c.phone || '';
  document.getElementById('c-email').value = c.email || '';
  document.getElementById('c-website').value = c.website || '';
  document.getElementById('c-logo').value = c.logo_url || '';
  document.getElementById('c-description').value = c.description || '';
  categorySelect.value = c.category_id ? String(c.category_id) : '';
}

function readForm() {
  return {
    name: document.getElementById('c-name').value.trim(),
    category_id: categorySelect.value ? Number(categorySelect.value) : null,
    country: document.getElementById('c-country').value.trim(),
    city: document.getElementById('c-city').value.trim(),
    address: document.getElementById('c-address').value.trim(),
    phone: document.getElementById('c-phone').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    website: document.getElementById('c-website').value.trim(),
    logo_url: document.getElementById('c-logo').value.trim(),
    description: document.getElementById('c-description').value.trim(),
  };
}

async function loadData() {
  const [{ data: cats, error: catErr }, { data: company, error: compErr }] = await Promise.all([
    sb().from('categories').select('id, name').order('name'),
    sb().from('companies').select('*').eq('owner_id', user.id).maybeSingle(),
  ]);
  if (catErr) return catErr;
  if (compErr) return compErr;
  categories = cats || [];
  myCompany = company;

  categorySelect.innerHTML = '<option value="">Select a category…</option>' +
    categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

  if (myCompany) {
    heading.textContent = 'Your Company Listing';
    setStatus(myCompany.status);
  } else {
    heading.textContent = 'Add Your Company Listing';
    setStatus('pending');
    note.innerHTML = 'Complete your listing below and submit it for approval. It becomes visible in the <a href="members.html">member directory</a> once approved.';
  }
  fillForm();

  loadingBox.hidden = true;
  content.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  msg.hidden = true;

  const values = readForm();
  let error;

  if (myCompany) {
    const update = { ...values };
    if (myCompany.status === 'rejected') update.status = 'pending'; // re-submit
    ({ error } = await sb().from('companies').update(update).eq('id', myCompany.id));
  } else {
    ({ error } = await sb().from('companies').insert({ ...values, owner_id: user.id }));
  }

  btn.disabled = false;
  if (error) return showMsg(error.message, 'error');

  showMsg(myCompany
    ? (myCompany.status === 'rejected' ? 'Listing updated and re-submitted for approval.' : 'Listing saved.')
    : 'Listing created — it will appear in the directory once approved.', 'success');

  await loadData();
  statusBadge.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.getElementById('btn-signout').addEventListener('click', async () => {
  await sb().auth.signOut();
  window.location.href = 'member-area.html';
});

async function init() {
  if (!isConfigured()) return configAlert();
  user = await getUser();
  if (!user) {
    window.location.href = 'member-area.html';
    return;
  }
  document.getElementById('dash-subtitle').textContent = user.email || '';
  const err = await loadData();
  if (err) showMsg(err.message, 'error');
}

init();
