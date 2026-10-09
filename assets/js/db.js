// ============================================================
// Shared Supabase client + small helpers for the
// member directory, member portal and admin portal.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let _sb = null;

export function sb() {
  if (!_sb) _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

// False while the placeholder values in config.js have not been replaced.
export function isConfigured() {
  return !SUPABASE_URL.includes('YOUR-PROJECT') && SUPABASE_ANON_KEY.length > 20;
}

// Current signed-in user (or null).
export async function getUser() {
  const { data } = await sb().auth.getUser();
  return data.user;
}

// True when the signed-in user has the admin role.
export async function userIsAdmin(user) {
  if (!user) return false;
  const { data } = await sb().from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin';
}

// Redirect helpers used by the gated pages.
export function redirectTo(url) {
  window.location.href = url;
}

// Turn "Air & Ocean Freight" → "air-ocean-freight" (for category slugs).
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Initials used for the avatar fallback when a company has no logo.
export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// Escape user-supplied text before inserting it into HTML.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
