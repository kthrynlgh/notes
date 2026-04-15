// ── API ────────────────────────────────────────────────────────────────────
const API = '/Notes';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (!options.skipJson && res.status !== 204) return await res.json();
  return null;
}

async function apiGetAll() {
  return await apiFetch('/') || [];
}

async function apiCreate(payload) {
  return await apiFetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function apiUpdate(id, payload) {
  return await apiFetch(`/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function apiDelete(id) {
  await apiFetch(`/${id}`, { method: 'DELETE', skipJson: true });
}

// ── State ──────────────────────────────────────────────────────────────────
let notes = [];

// ── Helpers ────────────────────────────────────────────────────────────────
function randomPos() {
  const board = document.getElementById('board');
  const w = board.clientWidth;
  const h = board.clientHeight;
  const margin = 80;
  const noteW = 230;
  const noteH = 200;
  return {
    x: margin + Math.random() * Math.max(w - noteW - margin * 2, 10),
    y: margin + Math.random() * Math.max(h - noteH - margin * 2, 10),
  };
}

function randomRotation() {
  return (Math.random() - 0.5) * 8;
}

const NOTE_COLORS = 6;

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderAll() {
  renderBoard();
  renderSidebar();
}

function renderBoard() {
  const board = document.getElementById('board');
  board.querySelectorAll('.note').forEach(el => el.remove());
  document.getElementById('empty').style.display = notes.length ? 'none' : 'block';
  notes.forEach(note => board.appendChild(createNoteElement(note, false)));
}

function createNoteElement(note, isNew = false) {
  const el = document.createElement('div');
  el.className = `note color-${note.color}${isNew ? ' new-note' : ''}`;
  el.dataset.id = note.id;
  el.style.left = note.x + 'px';
  el.style.top  = note.y + 'px';
  el.style.setProperty('--rot', note.rotation + 'deg');
  el.style.transform = `rotate(${note.rotation}deg)`;

  el.innerHTML = `
    <div class="pin"></div>
    <textarea class="note-content" placeholder="Write something…">${escHtml(note.text || '')}</textarea>
    <div class="note-footer">
      <button class="delete-btn" title="Delete note">✕</button>
    </div>
  `;

  // Text changes — debounced so we don't spam the API on every keystroke
  const ta = el.querySelector('.note-content');
  let debounceTimer;
  ta.addEventListener('input', () => {
    note.text = ta.value;
    renderSidebar();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      apiUpdate(note.id, noteToPayload(note));
    }, 600);
  });

  ta.addEventListener('mousedown',  e => e.stopPropagation());
  ta.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

  // Delete
  el.querySelector('.delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    removeNote(note.id, el);
  });

  // Drag
  makeDraggable(el, note);

  return el;
}

function renderSidebar() {
  const list = document.getElementById('note-list');
  list.innerHTML = '';

  if (!notes.length) {
    list.innerHTML = '<p style="color:var(--mid);font-size:0.78rem;padding:8px 10px;font-weight:600;">No notes yet.</p>';
    updateCount();
    return;
  }

  const colorBgs = ['#D2EDED','#FFCBCA','#fde9a2','#F7CBF7','#c8ecd4','#ffd6b0'];

  notes.forEach(note => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.dataset.id = note.id;

    const lines = (note.text || '').trim().split('\n');
    const title   = lines[0] || '(empty)';
    const preview = lines.slice(1).join(' ').trim();

    item.innerHTML = `
      <span class="li-title">${escHtml(title.slice(0, 40))}</span>
      <span class="li-preview">${escHtml(preview.slice(0, 50) || '—')}</span>
      <span class="color-chip" style="background:${colorBgs[note.color] || colorBgs[0]}; border: 1.5px solid rgba(0,0,0,0.1);"></span>
    `;

    item.addEventListener('click', () => focusNote(note.id));
    list.appendChild(item);
  });

  updateCount();
}

function updateCount() {
  const el = document.getElementById('note-count');
  if (el) el.textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`;
}

// ── Map between local note shape and API payload ───────────────────────────
// The API stores: title, content, x, y, rotation, color
// Locally we use: text (combines title+content), x, y, rotation, color
// Strategy: first line of text = title, rest = content

function noteToPayload(note) {
  const lines = (note.text || '').split('\n');
  return {
    title:    lines[0] || '(empty)',
    content:  lines.slice(1).join('\n') || '',
    x:        Math.round(note.x),
    y:        Math.round(note.y),
    rotation: note.rotation,
    color:    note.color,
  };
}

function payloadToNote(data) {
  const text = data.content
    ? `${data.title}\n${data.content}`
    : data.title === '(empty)' ? '' : data.title;
  return {
    id:       data.id,
    text:     text,
    x:        data.x ?? randomPos().x,
    y:        data.y ?? randomPos().y,
    rotation: data.rotation ?? randomRotation(),
    color:    data.color ?? Math.floor(Math.random() * NOTE_COLORS),
  };
}

// ── CRUD ───────────────────────────────────────────────────────────────────
async function addNote() {
  const pos = randomPos();
  const draft = {
    text:     '',
    x:        pos.x,
    y:        pos.y,
    rotation: randomRotation(),
    color:    Math.floor(Math.random() * NOTE_COLORS),
  };

  // Save to API first to get a real ID
  const saved = await apiCreate(noteToPayload(draft));
  if (!saved) return;

  const note = payloadToNote(saved);
  notes.push(note);

  const board = document.getElementById('board');
  document.getElementById('empty').style.display = 'none';
  const el = createNoteElement(note, true);
  board.appendChild(el);

  renderSidebar();

  el.addEventListener('animationend', () => {
    el.classList.remove('new-note');
    el.querySelector('.note-content').focus();
  }, { once: true });
}

async function removeNote(id, el) {
  el.style.transition = 'transform 0.18s ease, opacity 0.18s ease';
  el.style.transform  = `scale(0.7) rotate(${Math.random() * 20 - 10}deg)`;
  el.style.opacity    = '0';

  await apiDelete(id);

  setTimeout(() => {
    el.remove();
    notes = notes.filter(n => n.id !== id);
    if (!notes.length) document.getElementById('empty').style.display = 'block';
    renderSidebar();
  }, 180);
}

function focusNote(id) {
  const el = document.querySelector(`.note[data-id="${id}"]`);
  if (!el) return;
  el.style.zIndex = '50';
  el.style.transition = 'box-shadow 0.2s';
  el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.22)';
  setTimeout(() => {
    el.style.zIndex    = '';
    el.style.boxShadow = '';
  }, 900);
  el.querySelector('.note-content').focus();

  document.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
  const li = document.querySelector(`.list-item[data-id="${id}"]`);
  if (li) li.classList.add('active');
}

// ── Drag ───────────────────────────────────────────────────────────────────
function makeDraggable(el, note) {
  let startX, startY, origX, origY, dragging = false;

  function onDown(e) {
    if (e.target.closest('textarea') || e.target.closest('button')) return;
    dragging = true;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    origX  = note.x;
    origY  = note.y;
    el.classList.add('dragging');
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const board = document.getElementById('board');
    const bRect = board.getBoundingClientRect();
    note.x = Math.max(20, Math.min(origX + (pt.clientX - startX), bRect.width  - 230));
    note.y = Math.max(20, Math.min(origY + (pt.clientY - startY), bRect.height - 190));
    el.style.left = note.x + 'px';
    el.style.top  = note.y + 'px';
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    // Save new position to API
    apiUpdate(note.id, noteToPayload(note));
  }

  el.addEventListener('mousedown',  onDown);
  el.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove',  onMove);
  window.addEventListener('touchmove',  onMove, { passive: true });
  window.addEventListener('mouseup',    onUp);
  window.addEventListener('touchend',   onUp);
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  document.getElementById('add-btn').addEventListener('click', addNote);
  try {
    const data = await apiGetAll();
    notes = data.map(payloadToNote);
  } catch (err) {
    console.error('Failed to load notes from API:', err);
    notes = [];
  }
  renderAll();
}

init();