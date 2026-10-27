const API = '/api';
const app = document.getElementById('app');
const nav = document.getElementById('nav');

let token = localStorage.getItem('token');
let me = JSON.parse(localStorage.getItem('user') || 'null');

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => new Date(d.replace(' ', 'T') + 'Z').toLocaleString();

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  setTimeout(() => (t.className = ''), 2500);
}

async function api(path, method = 'GET', body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) logout(true);
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

function setAuth(data) {
  token = data.token; me = data.user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(me));
}

function logout(silent) {
  token = null; me = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  if (!silent) toast('Logged out');
  location.hash = '#/login';
}

function renderNav() {
  nav.innerHTML = me
    ? `<span>Hi, ${esc(me.username)}</span><a href="#/new">+ New Post</a><button id="logout">Logout</button>`
    : `<a href="#/login">Login</a><a href="#/register">Register</a>`;
  const l = document.getElementById('logout');
  if (l) l.onclick = () => logout();
}

// ---------- views ----------
async function homeView() {
  app.innerHTML = `
    <form class="search" id="searchForm"><input id="q" placeholder="Search posts..." /><button>Search</button></form>
    <div id="list">Loading...</div>`;
  const load = async (q = '') => {
    const posts = await api('/posts' + (q ? '?q=' + encodeURIComponent(q) : ''));
    document.getElementById('list').innerHTML = posts.length
      ? posts.map((p) => `
        <div class="card">
          <h2><a href="#/post/${p.id}">${esc(p.title)}</a></h2>
          <div class="meta">by ${esc(p.author)} • ${fmt(p.created_at)} • 💬 ${p.comment_count}</div>
          <div class="content">${esc(p.content.length > 220 ? p.content.slice(0, 220) + '…' : p.content)}</div>
        </div>`).join('')
      : '<div class="empty">No posts yet.</div>';
  };
  document.getElementById('searchForm').onsubmit = (e) => { e.preventDefault(); load(document.getElementById('q').value); };
  load();
}

function authView(mode) {
  const isReg = mode === 'register';
  app.innerHTML = `
    <div class="card">
      <h2>${isReg ? 'Create account' : 'Login'}</h2>
      <form id="f">
        ${isReg ? '<input name="username" placeholder="Username" required />' : ''}
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password (min 6 chars)" required />
        <button>${isReg ? 'Register' : 'Login'}</button>
      </form>
    </div>`;
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      setAuth(await api(`/auth/${mode}`, 'POST', body));
      toast(isReg ? 'Account created!' : 'Welcome back!');
      location.hash = '#/';
    } catch (err) { toast(err.message, true); }
  };
}

async function editorView(id) {
  if (!me) { location.hash = '#/login'; return; }
  let post = { title: '', content: '' };
  if (id) post = await api('/posts/' + id);
  app.innerHTML = `
    <div class="card">
      <h2>${id ? 'Edit post' : 'New post'}</h2>
      <form id="f">
        <input name="title" placeholder="Title" value="${esc(post.title)}" required />
        <textarea name="content" placeholder="Write something..." required>${esc(post.content)}</textarea>
        <button>${id ? 'Update' : 'Publish'}</button>
        <a class="btn secondary" href="#/">Cancel</a>
      </form>
    </div>`;
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      const saved = id ? await api('/posts/' + id, 'PUT', body) : await api('/posts', 'POST', body);
      toast(id ? 'Post updated' : 'Post published');
      location.hash = '#/post/' + saved.id;
    } catch (err) { toast(err.message, true); }
  };
}

async function postView(id) {
  const [post, comments] = await Promise.all([api('/posts/' + id), api(`/posts/${id}/comments`)]);
  const mine = me && me.id === post.author_id;
  app.innerHTML = `
    <div class="card">
      <h2>${esc(post.title)}</h2>
      <div class="meta">by ${esc(post.author)} • ${fmt(post.created_at)}${post.updated_at !== post.created_at ? ' (edited)' : ''}</div>
      <div class="content">${esc(post.content)}</div>
      ${mine ? `<div class="actions"><a class="btn small" href="#/edit/${post.id}">Edit</a><button class="danger small" id="del">Delete</button></div>` : ''}
    </div>
    <div class="card">
      <h3>Comments (${comments.length})</h3>
      ${comments.map((c) => `
        <div class="comment">
          <div class="meta"><b>${esc(c.author)}</b> • ${fmt(c.created_at)}</div>
          <p>${esc(c.content)}</p>
          ${me && (me.id === c.user_id || mine) ? `<button class="danger small" data-del="${c.id}">Delete</button>` : ''}
        </div>`).join('') || '<div class="empty">No comments yet. Be the first!</div>'}
      ${me
        ? `<form id="cf"><textarea name="content" placeholder="Add a comment..." required style="min-height:70px"></textarea><button>Post comment</button></form>`
        : `<p><a href="#/login">Login</a> to comment.</p>`}
    </div>`;

  const del = document.getElementById('del');
  if (del) del.onclick = async () => {
    if (!confirm('Delete this post?')) return;
    try { await api('/posts/' + id, 'DELETE'); toast('Post deleted'); location.hash = '#/'; }
    catch (err) { toast(err.message, true); }
  };
  document.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    try { await api('/comments/' + b.dataset.del, 'DELETE'); toast('Comment deleted'); postView(id); }
    catch (err) { toast(err.message, true); }
  }));
  const cf = document.getElementById('cf');
  if (cf) cf.onsubmit = async (e) => {
    e.preventDefault();
    try { await api(`/posts/${id}/comments`, 'POST', Object.fromEntries(new FormData(cf))); postView(id); }
    catch (err) { toast(err.message, true); }
  };
}

// ---------- router ----------
async function router() {
  renderNav();
  const [, page, id] = (location.hash || '#/').split('/');
  try {
    if (!page) await homeView();
    else if (page === 'login') authView('login');
    else if (page === 'register') authView('register');
    else if (page === 'new') await editorView();
    else if (page === 'edit') await editorView(id);
    else if (page === 'post') await postView(id);
    else app.innerHTML = '<div class="empty">Page not found</div>';
  } catch (err) {
    app.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}
window.addEventListener('hashchange', router);
router();
