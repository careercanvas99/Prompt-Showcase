/* ============================================================
   PromptAI Gallery — script.js
   Vanilla JavaScript + Supabase SDK (loaded via CDN)
   ============================================================

   SETUP REQUIRED — before opening index.html:
   1. Go to your Supabase project dashboard
   2. Settings → API → copy "Project URL" and "anon public" key
   3. Paste them below replacing the placeholder values

   ============================================================ */

const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // e.g. https://abcdefgh.supabase.co
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';  // anon / public key

/* ── Supabase client ── */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── App state ── */
let allPrompts     = [];
let currentPrompt  = null;
let currentCategory = 'All';
const ADMIN_KEY    = 'promptai_admin';

/* ────────────────────────────────────────────
   UTILITY FUNCTIONS
   ──────────────────────────────────────────── */

/** SHA-256 hash via native WebCrypto API (no library needed) */
async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Escape HTML special characters to prevent XSS */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format ISO date string to readable format */
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

/* ────────────────────────────────────────────
   TOAST NOTIFICATIONS
   ──────────────────────────────────────────── */

let toastTimer = null;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerHTML = (type === 'success' ? '✅' : '❌') + ' ' + message;
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

/* ────────────────────────────────────────────
   GALLERY — LOAD & RENDER
   ──────────────────────────────────────────── */

async function loadPrompts() {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '<div class="state-msg"><div class="spinner"></div><p>Loading prompts…</p></div>';

  const { data, error } = await sb
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    gallery.innerHTML = '<div class="state-msg"><div class="icon">⚠️</div><p>Failed to load prompts.<br>Check your Supabase config in script.js.</p></div>';
    return;
  }

  allPrompts = data || [];
  buildFilters();
  renderGallery();
}

/** Build category filter buttons from available data */
function buildFilters() {
  const categories = ['All', ...new Set(allPrompts.map(p => p.category).filter(Boolean))];
  const wrap = document.getElementById('categoryFilters');
  wrap.innerHTML = categories.map(cat =>
    `<button class="filter-btn${cat === currentCategory ? ' active' : ''}"
      onclick="setCategory('${cat}', this)">${esc(cat)}</button>`
  ).join('');
}

/** Set active category filter */
function setCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderGallery();
}

/** Get filtered prompts based on search and category */
function getFiltered() {
  const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  return allPrompts.filter(p => {
    const matchCat = currentCategory === 'All' || p.category === currentCategory;
    const matchQ   = !query
      || (p.title || '').toLowerCase().includes(query)
      || (p.prompt_text || '').toLowerCase().includes(query);
    return matchCat && matchQ;
  });
}

/** Re-render gallery with current filters */
function renderGallery() {
  const gallery  = document.getElementById('gallery');
  const filtered = getFiltered();

  if (!filtered.length) {
    gallery.innerHTML = `
      <div class="state-msg">
        <div class="icon">🔮</div>
        <p>${allPrompts.length
          ? 'No prompts match your search.'
          : 'No prompts yet — add some via the Admin panel!'}</p>
      </div>`;
    return;
  }

  gallery.innerHTML = filtered.map((p, i) => `
    <article class="card" style="animation-delay:${i * 0.06}s" onclick="openPrompt(${p.id})">
      ${p.image_url
        ? `<img class="card-img" src="${esc(p.image_url)}" alt="${esc(p.title)}"
              loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
           <div class="card-img-placeholder" style="display:none">✦</div>`
        : `<div class="card-img-placeholder">✦</div>`}
      <div class="card-body">
        <div class="card-category">${esc(p.category || 'General')}</div>
        <div class="card-title">${esc(p.title)}</div>
        <div class="card-preview">${esc(p.prompt_text)}</div>
      </div>
      <div class="card-footer">
        <span class="copy-hint">📋 Click to copy prompt</span>
        <span class="card-date">${formatDate(p.created_at)}</span>
      </div>
    </article>
  `).join('');
}

/** Called by search input oninput */
function filterCards() { renderGallery(); }

/* ────────────────────────────────────────────
   PROMPT VIEW MODAL
   ──────────────────────────────────────────── */

function openPrompt(id) {
  const p = allPrompts.find(x => x.id === id);
  if (!p) return;
  currentPrompt = p;

  document.getElementById('viewModalCat').textContent   = p.category || 'General';
  document.getElementById('viewModalTitle').textContent = p.title;
  document.getElementById('viewModalPrompt').textContent = p.prompt_text;
  document.getElementById('viewModalImg').innerHTML = p.image_url
    ? `<img class="modal-img" src="${esc(p.image_url)}" alt="${esc(p.title)}"
          onerror="this.parentElement.innerHTML='<div class=\\'modal-img-placeholder\\'>✦</div>'" />`
    : `<div class="modal-img-placeholder">✦</div>`;

  document.getElementById('viewModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeViewModal(e) {
  if (e.target === document.getElementById('viewModal')) closeViewModalDirect();
}

function closeViewModalDirect() {
  document.getElementById('viewModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function copyPrompt() {
  if (!currentPrompt) return;
  try {
    await navigator.clipboard.writeText(currentPrompt.prompt_text);
    showToast('Prompt copied to clipboard!');
  } catch {
    showToast('Copy failed — please select and copy manually.', 'error');
  }
}

/* ────────────────────────────────────────────
   ADMIN — LOGIN
   ──────────────────────────────────────────── */

function openAdmin() {
  if (isLoggedIn()) { openDashboard(); return; }
  const overlay = document.getElementById('adminOverlay');
  overlay.classList.add('open');
  document.getElementById('loginErr').style.display = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('loginUser').focus(), 100);
}

function closeAdmin() {
  document.getElementById('adminOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeAdminOverlay(e) {
  if (e.target === document.getElementById('adminOverlay')) closeAdmin();
}

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl    = document.getElementById('loginErr');
  const btn      = document.getElementById('loginBtn');

  if (!username || !password) {
    errEl.textContent    = 'Please enter both username and password.';
    errEl.style.display  = 'block';
    return;
  }

  btn.textContent = 'Signing in…';
  btn.disabled    = true;
  errEl.style.display = 'none';

  try {
    const hash = await sha256(password);
    const { data, error } = await sb
      .from('admins')
      .select('id')
      .eq('username', username)
      .eq('password_hash', hash)
      .maybeSingle();

    if (error || !data) {
      errEl.textContent   = 'Invalid username or password.';
      errEl.style.display = 'block';
    } else {
      localStorage.setItem(ADMIN_KEY, username);
      closeAdmin();
      updateNavForAdmin(username);
      openDashboard();
    }
  } catch (err) {
    errEl.textContent   = 'Connection error — check Supabase config in script.js.';
    errEl.style.display = 'block';
  }

  btn.textContent = 'Sign In';
  btn.disabled    = false;
}

function doLogout() {
  localStorage.removeItem(ADMIN_KEY);
  closeDashboard();
  const btn = document.getElementById('adminNavBtn');
  btn.classList.remove('admin-active');
  btn.textContent = '⌘ Admin';
  showToast('Signed out successfully.');
}

function isLoggedIn()  { return !!localStorage.getItem(ADMIN_KEY); }
function getAdminName(){ return localStorage.getItem(ADMIN_KEY) || 'Admin'; }

function updateNavForAdmin(name) {
  const btn = document.getElementById('adminNavBtn');
  btn.classList.add('admin-active');
  btn.textContent = '⌘ ' + name;
}

/* ────────────────────────────────────────────
   ADMIN — DASHBOARD
   ──────────────────────────────────────────── */

function openDashboard() {
  document.getElementById('dashboardOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  loadDashboard();
}

function closeDashboard() {
  document.getElementById('dashboardOverlay').classList.remove('open');
  document.body.style.overflow = '';
  loadPrompts(); // refresh public gallery
}

async function loadDashboard() {
  document.getElementById('promptList').innerHTML =
    '<div style="color:var(--muted);font-size:14px;padding:20px 0;">Loading…</div>';

  const { data, error } = await sb
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('promptList').innerHTML =
      '<div style="color:#f87171;font-size:14px;">Failed to load prompts.</div>';
    return;
  }

  const prompts = data || [];
  document.getElementById('statTotal').textContent = prompts.length;
  document.getElementById('statCats').textContent  =
    new Set(prompts.map(p => p.category).filter(Boolean)).size;

  renderPromptList(prompts);
}

function renderPromptList(prompts) {
  const list = document.getElementById('promptList');
  if (!prompts.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:14px;padding:20px 0;">No prompts yet — add one above!</div>';
    return;
  }
  list.innerHTML = prompts.map(p => `
    <div class="prompt-row">
      ${p.image_url
        ? `<img src="${esc(p.image_url)}" alt="" loading="lazy"
              onerror="this.style.background='#1e1b4b';this.removeAttribute('src')" />`
        : `<div style="width:64px;height:48px;border-radius:8px;background:#1e1b4b;flex-shrink:0;"></div>`}
      <div class="prompt-row-info">
        <div class="prompt-row-title">${esc(p.title)}</div>
        <div class="prompt-row-cat">${esc(p.category || 'General')}</div>
      </div>
      <div class="prompt-row-actions">
        <button class="icon-btn" onclick="editPrompt(${p.id})" title="Edit">✏️</button>
        <button class="icon-btn del" onclick="deletePrompt(${p.id})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

/* ────────────────────────────────────────────
   ADMIN — PROMPT FORM (Add / Edit)
   ──────────────────────────────────────────── */

function previewImg() {
  const url  = document.getElementById('fImageUrl').value.trim();
  const img  = document.getElementById('imgPreview');
  if (url) {
    img.src = url;
    img.classList.add('show');
    img.onerror = () => img.classList.remove('show');
  } else {
    img.classList.remove('show');
  }
}

async function savePrompt() {
  const id          = document.getElementById('editId').value;
  const title       = document.getElementById('fTitle').value.trim();
  const image_url   = document.getElementById('fImageUrl').value.trim();
  const prompt_text = document.getElementById('fPrompt').value.trim();
  const category    = document.getElementById('fCategory').value;

  if (!title || !prompt_text) {
    showToast('Title and prompt text are required.', 'error');
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.textContent = 'Saving…';
  btn.disabled    = true;

  const payload = { title, image_url, prompt_text, category };
  const { error } = id
    ? await sb.from('prompts').update(payload).eq('id', id)
    : await sb.from('prompts').insert(payload);

  btn.textContent = 'Save Prompt';
  btn.disabled    = false;

  if (error) { showToast('Save failed: ' + error.message, 'error'); return; }

  showToast(id ? 'Prompt updated!' : 'Prompt added to gallery!');
  resetForm();
  loadDashboard();
}

async function editPrompt(id) {
  const { data: p } = await sb.from('prompts').select('*').eq('id', id).maybeSingle();
  if (!p) return;

  document.getElementById('editId').value         = p.id;
  document.getElementById('fTitle').value         = p.title;
  document.getElementById('fImageUrl').value      = p.image_url || '';
  document.getElementById('fPrompt').value        = p.prompt_text;
  document.getElementById('fCategory').value      = p.category || 'General';
  document.getElementById('formHeading').textContent = '✏️ Edit Prompt';
  previewImg();

  document.querySelector('.prompt-form-card').scrollIntoView({ behavior: 'smooth' });
}

async function deletePrompt(id) {
  if (!confirm('Delete this prompt? This cannot be undone.')) return;
  const { error } = await sb.from('prompts').delete().eq('id', id);
  if (error) { showToast('Delete failed.', 'error'); return; }
  showToast('Prompt deleted.');
  loadDashboard();
}

function resetForm() {
  document.getElementById('editId').value            = '';
  document.getElementById('fTitle').value            = '';
  document.getElementById('fImageUrl').value         = '';
  document.getElementById('fPrompt').value           = '';
  document.getElementById('fCategory').value         = 'General';
  document.getElementById('formHeading').textContent = '➕ Add New Prompt';
  document.getElementById('imgPreview').classList.remove('show');
}

/* ────────────────────────────────────────────
   KEYBOARD SHORTCUTS
   ──────────────────────────────────────────── */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeViewModalDirect();
    closeAdmin();
  }
});

/* ────────────────────────────────────────────
   INITIALISE
   ──────────────────────────────────────────── */

(function init() {
  // Restore admin session from localStorage
  if (isLoggedIn()) {
    updateNavForAdmin(getAdminName());
  }

  // Load gallery
  loadPrompts();
})();
