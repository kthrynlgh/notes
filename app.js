// ── Storage ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'corkboard_notes_v2';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ── State ──────────────────────────────────────────────────────────────────
let notes = loadNotes();

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

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
  return (Math.random() - 0.5) * 8; // −4° to +4°
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
    <textarea class="note-content" placeholder="Write something…">${escHtml(note.text)}</textarea>
    <div class="note-footer">
      <button class="delete-btn" title="Delete note">✕</button>
    </div>
  `;

  // Text changes
  const ta = el.querySelector('.note-content');
  ta.addEventListener('input', () => {
    updateNote(note.id, { text: ta.value });
  });
  // Prevent drag when interacting with textarea
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

    const lines = note.text.trim().split('\n');
    const title   = lines[0] || '(empty)';
    const preview = lines.slice(1).join(' ').trim();

    item.innerHTML = `
      <span class="li-title">${escHtml(title.slice(0, 40))}</span>
      <span class="li-preview">${escHtml(preview.slice(0, 50) || '—')}</span>
      <span class="color-chip" style="background:${colorBgs[note.color]}; border: 1.5px solid rgba(0,0,0,0.1);"></span>
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

// ── CRUD ───────────────────────────────────────────────────────────────────
function addNote() {
  const pos = randomPos();
  const note = {
    id:        uid(),
    text:      '',
    x:         pos.x,
    y:         pos.y,
    rotation:  randomRotation(),
    color:     Math.floor(Math.random() * NOTE_COLORS),
    createdAt: Date.now(),
  };
  notes.push(note);
  saveNotes();

  const board = document.getElementById('board');
  document.getElementById('empty').style.display = 'none';
  const el = createNoteElement(note, true);
  board.appendChild(el);

  renderSidebar();

  // Remove animation class after it finishes, then focus
  el.addEventListener('animationend', () => {
    el.classList.remove('new-note');
    el.querySelector('.note-content').focus();
  }, { once: true });
}

function updateNote(id, changes) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  Object.assign(note, changes);
  saveNotes();
  renderSidebar();
}

function removeNote(id, el) {
  // Quick scale-out animation
  el.style.transition = 'transform 0.18s ease, opacity 0.18s ease';
  el.style.transform  = `scale(0.7) rotate(${Math.random() * 20 - 10}deg)`;
  el.style.opacity    = '0';
  setTimeout(() => {
    el.remove();
    notes = notes.filter(n => n.id !== id);
    saveNotes();
    if (!notes.length) document.getElementById('empty').style.display = 'block';
    renderSidebar();
  }, 180);
}

function focusNote(id) {
  const el = document.querySelector(`.note[data-id="${id}"]`);
  if (!el) return;
  // Temporarily pop to top
  el.style.zIndex = '50';
  el.style.transition = 'box-shadow 0.2s';
  el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.22)';
  setTimeout(() => {
    el.style.zIndex    = '';
    el.style.boxShadow = '';
  }, 900);
  el.querySelector('.note-content').focus();

  // Highlight sidebar item
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
    saveNotes();
  }

  el.addEventListener('mousedown',  onDown);
  el.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove',  onMove);
  window.addEventListener('touchmove',  onMove, { passive: true });
  window.addEventListener('mouseup',    onUp);
  window.addEventListener('touchend',   onUp);
}

// ── Init ───────────────────────────────────────────────────────────────────
document.getElementById('add-btn').addEventListener('click', addNote);
renderAll();
