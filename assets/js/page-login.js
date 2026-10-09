// Member Area (member-area.html) — login, sign-up and password recovery.
import { sb, isConfigured, getUser } from './db.js';

const authCard = document.getElementById('auth-card');
const loadingBox = document.getElementById('auth-loading');
const formLogin = document.getElementById('form-login');
const formSignup = document.getElementById('form-signup');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginMsg = document.getElementById('login-msg');
const signupMsg = document.getElementById('signup-msg');

function configAlert() {
  document.getElementById('config-alert').innerHTML =
    '<div class="alert-note"><strong>Member area is not connected yet.</strong> ' +
    'Follow <code>SUPABASE_SETUP.md</code> to create the database and add your project keys to ' +
    '<code>assets/js/config.js</code>.</div>';
  loadingBox.hidden = true;
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `form-msg is-${type}`;
  el.hidden = false;
}

function switchTab(which) {
  const login = which === 'login';
  formLogin.hidden = !login;
  formSignup.hidden = login;
  tabLogin.classList.toggle('is-active', login);
  tabSignup.classList.toggle('is-active', !login);
  tabLogin.setAttribute('aria-selected', login);
  tabSignup.setAttribute('aria-selected', !login);
  loginMsg.hidden = true;
  signupMsg.hidden = true;
}

// Password recovery: Supabase sends the user back here with
// #type=recovery in the URL — show a "set new password" form.
function handleRecovery() {
  if (!location.hash.includes('type=recovery')) return false;
  history.replaceState(null, '', location.pathname);
  switchTab('login');
  formLogin.hidden = true;

  const form = document.createElement('form');
  form.innerHTML = `
    <h2 style="margin-top:0;">Set a New Password</h2>
    <div class="form-grid">
      <div class="field">
        <label for="recovery-password">New Password <span class="muted" style="font-weight:400;">(min. 6 characters)</span></label>
        <input type="password" id="recovery-password" required minlength="6" autocomplete="new-password">
      </div>
    </div>
    <p class="form-msg" id="recovery-msg" role="alert" hidden></p>
    <button class="btn btn-primary" type="submit">Update Password</button>`;
  authCard.appendChild(form);
  const msg = form.querySelector('#recovery-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    const { error } = await sb().auth.updateUser({
      password: form.querySelector('#recovery-password').value,
    });
    btn.disabled = false;
    if (error) return showMsg(msg, error.message, 'error');
    showMsg(msg, 'Password updated — you are signed in.', 'success');
    setTimeout(() => { window.location.href = 'member-dashboard.html'; }, 800);
  });
  return true;
}

async function init() {
  if (!isConfigured()) return configAlert();

  // Already signed in? Go straight to the dashboard.
  const user = await getUser();
  if (user && !location.hash.includes('type=recovery')) {
    window.location.href = 'member-dashboard.html';
    return;
  }

  loadingBox.hidden = true;
  authCard.hidden = false;

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabSignup.addEventListener('click', () => switchTab('signup'));
  document.getElementById('link-to-signup').addEventListener('click', (e) => { e.preventDefault(); switchTab('signup'); });
  document.getElementById('link-to-login').addEventListener('click', (e) => { e.preventDefault(); switchTab('login'); });

  if (handleRecovery()) return;

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formLogin.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await sb().auth.signInWithPassword({
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value,
    });
    btn.disabled = false;
    if (error) return showMsg(loginMsg, error.message, 'error');
    window.location.href = 'member-dashboard.html';
  });

  document.getElementById('link-forgot').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    if (!email) return showMsg(loginMsg, 'Enter your email address above first, then click "Forgot your password?" again.', 'error');
    const { error } = await sb().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}${location.pathname}`,
    });
    if (error) return showMsg(loginMsg, error.message, 'error');
    showMsg(loginMsg, 'Password reset email sent — check your inbox.', 'success');
  });

  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formSignup.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { data, error } = await sb().auth.signUp({
      email: document.getElementById('signup-email').value.trim(),
      password: document.getElementById('signup-password').value,
      options: { data: { full_name: document.getElementById('signup-name').value.trim() } },
    });
    btn.disabled = false;
    if (error) return showMsg(signupMsg, error.message, 'error');
    if (data.session) {
      window.location.href = 'member-dashboard.html';
    } else {
      showMsg(signupMsg, 'Account created — check your email to confirm your address, then log in.', 'success');
      switchTab('login');
      signupMsg.hidden = false;
    }
  });
}

init();
