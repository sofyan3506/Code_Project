/* ============================================================
   DASHBOARD – app.js
   Vanilla JavaScript – no frameworks, no dependencies.
   All data stored in localStorage.
   ============================================================ */

'use strict';

/* ── LocalStorage keys ── */
const KEY_NAME   = 'dashboard_name';
const KEY_THEME  = 'dashboard_theme';
const KEY_TODOS  = 'dashboard_todos';
const KEY_LINKS  = 'dashboard_links';
const KEY_TIMER  = 'dashboard_timer_minutes';

/* ============================================================
   HELPERS
   ============================================================ */

/** Read from localStorage (returns parsed JSON or fallback). */
function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Write to localStorage. */
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Generate a simple unique id. */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Zero-pad a number to 2 digits. */
function pad(n) {
  return String(n).padStart(2, '0');
}

/* ============================================================
   DATETIME & GREETING
   ============================================================ */

const datetimeEl = document.getElementById('datetime');
const greetingEl = document.getElementById('greeting');

function getGreetingWord(hour) {
  if (hour >= 5  && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function updateDatetime() {
  const now      = new Date();
  const hour     = now.getHours();
  const name     = load(KEY_NAME, '');

  const dateStr  = now.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr  = now.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  datetimeEl.textContent = `${timeStr}  ·  ${dateStr}`;
  greetingEl.textContent  = name
    ? `${getGreetingWord(hour)}, ${name}! 👋`
    : `${getGreetingWord(hour)}! 👋`;
}

updateDatetime();
setInterval(updateDatetime, 1000);

/* ============================================================
   CUSTOM NAME (modal on first visit)
   ============================================================ */

const nameModal   = document.getElementById('nameModal');
const nameInput   = document.getElementById('nameInput');
const nameSaveBtn = document.getElementById('nameSaveBtn');

function openNameModal() {
  nameInput.value = load(KEY_NAME, '');
  nameModal.classList.remove('hidden');
  nameInput.focus();
}

function closeNameModal() {
  nameModal.classList.add('hidden');
}

function saveName() {
  const val = nameInput.value.trim();
  if (!val) return;
  save(KEY_NAME, val);
  updateDatetime();
  closeNameModal();
}

nameSaveBtn.addEventListener('click', saveName);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });

// Close modal when clicking the backdrop
nameModal.addEventListener('click', (e) => {
  if (e.target === nameModal) closeNameModal();
});

// Show modal on first visit (no name stored)
if (!load(KEY_NAME)) {
  openNameModal();
}

// Allow re-opening the modal by clicking the greeting text
greetingEl.style.cursor = 'pointer';
greetingEl.title = 'Click to change your name';
greetingEl.addEventListener('click', openNameModal);

/* ============================================================
   THEME (light / dark)
   ============================================================ */

const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');
const htmlEl      = document.documentElement;

function applyTheme(theme) {
  htmlEl.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  save(KEY_THEME, theme);
}

// Load saved theme (default: dark)
applyTheme(load(KEY_THEME, 'dark'));

themeToggle.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   FOCUS TIMER (Pomodoro)
   ============================================================ */

const timerDisplay     = document.getElementById('timerDisplay');
const timerStartBtn    = document.getElementById('timerStart');
const timerStopBtn     = document.getElementById('timerStop');
const timerResetBtn    = document.getElementById('timerReset');
const timerDurationIn  = document.getElementById('timerDuration');
const timerSetDurBtn   = document.getElementById('timerSetDuration');

let timerMinutes    = load(KEY_TIMER, 25);
let timerSeconds    = timerMinutes * 60;
let timerInterval   = null;
let timerRunning    = false;

// Keep the input in sync with the loaded value
timerDurationIn.value = timerMinutes;

function renderTimer() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  timerDisplay.textContent = `${pad(m)}:${pad(s)}`;
}

function setTimerState(state) {
  // state: 'idle' | 'running' | 'finished'
  timerDisplay.className = 'timer__display';
  if (state === 'running')  timerDisplay.classList.add('running');
  if (state === 'finished') timerDisplay.classList.add('finished');
}

renderTimer();
setTimerState('idle');

function startTimer() {
  if (timerRunning || timerSeconds <= 0) return;
  timerRunning = true;
  setTimerState('running');
  timerInterval = setInterval(() => {
    timerSeconds--;
    renderTimer();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      setTimerState('finished');
      timerDisplay.textContent = '00:00';
      // Browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('Focus session complete! 🎉', {
          body: 'Time to take a break.',
          icon: '', // could add a favicon path here
        });
      }
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  setTimerState('idle');
}

function resetTimer() {
  stopTimer();
  timerSeconds = timerMinutes * 60;
  renderTimer();
  setTimerState('idle');
}

function setCustomDuration() {
  const val = parseInt(timerDurationIn.value, 10);
  if (isNaN(val) || val < 1 || val > 120) {
    timerDurationIn.focus();
    timerDurationIn.select();
    return;
  }
  timerMinutes  = val;
  timerSeconds  = timerMinutes * 60;
  save(KEY_TIMER, timerMinutes);
  resetTimer();
}

timerStartBtn.addEventListener('click', startTimer);
timerStopBtn.addEventListener ('click', stopTimer);
timerResetBtn.addEventListener('click', resetTimer);
timerSetDurBtn.addEventListener('click', setCustomDuration);
timerDurationIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') setCustomDuration(); });

// Request notification permission once
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

/* ============================================================
   TO-DO LIST
   ============================================================ */

const todoForm   = document.getElementById('todoForm');
const todoInput  = document.getElementById('todoInput');
const todoListEl = document.getElementById('todoList');
const todoEmpty  = document.getElementById('todoEmpty');

/** @type {{ id: string, text: string, done: boolean }[]} */
let todos = load(KEY_TODOS, []);

function saveTodos() {
  save(KEY_TODOS, todos);
}

function renderTodos() {
  todoListEl.innerHTML = '';

  if (todos.length === 0) {
    todoEmpty.classList.remove('hidden');
    return;
  }
  todoEmpty.classList.add('hidden');

  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = `todo__item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.className = 'todo__checkbox';
    checkbox.checked   = todo.done;
    checkbox.setAttribute('aria-label', `Mark "${todo.text}" as ${todo.done ? 'not done' : 'done'}`);
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    // Text
    const span = document.createElement('span');
    span.className   = 'todo__text';
    span.textContent = todo.text;

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'todo__actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'todo__btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit task';
    editBtn.setAttribute('aria-label', `Edit "${todo.text}"`);
    editBtn.addEventListener('click', () => startEditTodo(todo.id, li, span));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo__btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete task';
    deleteBtn.setAttribute('aria-label', `Delete "${todo.text}"`);
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, span, actions);
    todoListEl.appendChild(li);
  });
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.push({ id: uid(), text: trimmed, done: false });
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  renderTodos();
}

function startEditTodo(id, liEl, spanEl) {
  // Replace text span with an input
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  const editInput = document.createElement('input');
  editInput.type      = 'text';
  editInput.className = 'todo__edit-input';
  editInput.value     = todo.text;
  editInput.maxLength = 200;

  spanEl.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  // Hide the action buttons while editing
  const actions = liEl.querySelector('.todo__actions');
  actions.style.display = 'none';

  // Save & confirm button
  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn btn--primary btn--sm';
  saveBtn.textContent = '✓';
  saveBtn.title       = 'Save';

  function confirmEdit() {
    const newText = editInput.value.trim();
    if (!newText) { editInput.focus(); return; }
    todo.text = newText;
    saveTodos();
    renderTodos();
  }

  saveBtn.addEventListener('click', confirmEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  confirmEdit();
    if (e.key === 'Escape') renderTodos();   // cancel
  });

  actions.after(saveBtn);
  actions.style.display = 'none';
}

todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(todoInput.value);
  todoInput.value = '';
  todoInput.focus();
});

// Initial render
renderTodos();

/* ============================================================
   QUICK LINKS
   ============================================================ */

const linkForm   = document.getElementById('linkForm');
const linkNameIn = document.getElementById('linkName');
const linkUrlIn  = document.getElementById('linkUrl');
const linksEl    = document.getElementById('linksList');
const linksEmpty = document.getElementById('linksEmpty');

/** @type {{ id: string, name: string, url: string }[]} */
let links = load(KEY_LINKS, []);

function saveLinks() {
  save(KEY_LINKS, links);
}

/** Return a Google favicon URL for a given site URL. */
function faviconUrl(url) {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return '';
  }
}

function renderLinks() {
  linksEl.innerHTML = '';

  if (links.length === 0) {
    linksEmpty.classList.remove('hidden');
    return;
  }
  linksEmpty.classList.add('hidden');

  links.forEach((link) => {
    const chip = document.createElement('a');
    chip.className = 'link-chip';
    chip.href      = link.url;
    chip.target    = '_blank';
    chip.rel       = 'noopener noreferrer';

    const favicon = document.createElement('img');
    favicon.className = 'link-chip__favicon';
    favicon.src       = faviconUrl(link.url);
    favicon.alt       = '';
    favicon.onerror   = () => { favicon.style.display = 'none'; };

    const label = document.createElement('span');
    label.textContent = link.name;

    const delBtn = document.createElement('button');
    delBtn.className = 'link-chip__delete';
    delBtn.textContent = '✕';
    delBtn.title = `Remove ${link.name}`;
    delBtn.setAttribute('aria-label', `Remove ${link.name}`);
    // Prevent the anchor click from firing when deleting
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteLink(link.id);
    });

    chip.append(favicon, label, delBtn);
    linksEl.appendChild(chip);
  });
}

function addLink(name, url) {
  const trimName = name.trim();
  let   trimUrl  = url.trim();

  if (!trimName || !trimUrl) return;

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(trimUrl)) {
    trimUrl = 'https://' + trimUrl;
  }

  links.push({ id: uid(), name: trimName, url: trimUrl });
  saveLinks();
  renderLinks();
}

function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
}

linkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addLink(linkNameIn.value, linkUrlIn.value);
  linkNameIn.value = '';
  linkUrlIn.value  = '';
  linkNameIn.focus();
});

// Initial render
renderLinks();
