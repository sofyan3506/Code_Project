/* ============================================================
   DASHBOARD – app.js
   Vanilla JavaScript – no frameworks, no dependencies.
   All data stored in localStorage.
   ============================================================ */

'use strict';

/* ── LocalStorage keys ── */
const KEY_NAME    = 'dashboard_name';
const KEY_THEME   = 'dashboard_theme';
const KEY_TODOS   = 'dashboard_todos';
const KEY_LINKS   = 'dashboard_links';
const KEY_TIMER   = 'dashboard_timer_seconds';
const KEY_XP      = 'dashboard_xp';
const KEY_LEVEL   = 'dashboard_level';
const KEY_STREAK  = 'dashboard_streak';
const KEY_STREAK_DATE = 'dashboard_streak_date';

/* ============================================================
   HELPERS
   ============================================================ */
function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pad(n) { return String(n).padStart(2, '0'); }

/* ============================================================
   AUDIO – Button Click & Timer Alarm (Web Audio API, no files)
   ============================================================ */
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playClick() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

function playAlarm() {
  try {
    const ctx = getAudioCtx();
    // Three rising beeps
    [0, 0.28, 0.56].forEach((offset) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime + offset);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + offset + 0.18);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.25);
    });
  } catch (_) {}
}

/* ── Attach click sound + visual pop to every .btn ── */
function attachButtonSounds() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn, .btn-icon, .todo__btn');
    if (!btn) return;
    playClick();
    btn.classList.remove('btn--clicked');
    // Force reflow so animation re-triggers
    void btn.offsetWidth;
    btn.classList.add('btn--clicked');
    btn.addEventListener('animationend', () => btn.classList.remove('btn--clicked'), { once: true });
  });
}
attachButtonSounds();

/* ============================================================
   RANDOM QUOTES GENERATOR
   ============================================================ */
const QUOTES = [
  "Code is like humor. When you have to explain it, it's bad. – Cory House",
  "First, solve the problem. Then, write the code. – John Johnson",
  "Experience is the name everyone gives to their mistakes. – Oscar Wilde",
  "In order to be irreplaceable, one must always be different. – Coco Chanel",
  "Java is to JavaScript what car is to Carpet. – Chris Heilmann",
  "The best error message is the one that never shows up. – Thomas Fuchs",
  "Debugging is twice as hard as writing the code. – Brian Kernighan",
  "Make it work, make it right, make it fast. – Kent Beck",
  "Talk is cheap. Show me the code. – Linus Torvalds",
  "Any fool can write code that a computer can understand. Good programmers write code humans can understand. – Martin Fowler",
  "Simplicity is the soul of efficiency. – Austin Freeman",
  "Before software can be reusable it first has to be usable. – Ralph Johnson",
  "The function of good software is to make the complex appear simple. – Grady Booch",
  "If debugging is the process of removing bugs, then programming must be the process of putting them in. – Edsger Dijkstra",
  "Clean code always looks like it was written by someone who cares. – Robert C. Martin",
];

const quoteTextEl    = document.getElementById('quoteText');
const quoteRefreshBtn = document.getElementById('quoteRefresh');
let lastQuoteIdx = -1;

function showRandomQuote() {
  let idx;
  do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === lastQuoteIdx);
  lastQuoteIdx = idx;
  quoteTextEl.textContent = `"${QUOTES[idx]}"`;
}

showRandomQuote();
quoteRefreshBtn.addEventListener('click', showRandomQuote);

/* ============================================================
   XP / LEVEL SYSTEM  +  FOCUS STREAK
   ============================================================ */
const LEVELS = [
  { name: 'Novice Coder',      xpRequired: 0   },
  { name: 'Master Coder',      xpRequired: 200 },
  { name: 'High Master Coder', xpRequired: 500 },
  { name: 'Arcane Coder',      xpRequired: 1000 },
];
const XP_PER_SESSION = 50;
const XP_PER_TASK    = 20;

const xpLevelEl  = document.getElementById('xpLevel');
const xpScoreEl  = document.getElementById('xpScore');
const xpFillEl   = document.getElementById('xpFill');
const xpTrackEl  = document.getElementById('xpTrack');
const streakEl   = document.getElementById('streakCount');

let xpTotal  = load(KEY_XP,    0);
let xpLevel  = load(KEY_LEVEL, 0); // index into LEVELS[]

function getCurrentLevelData() {
  const cur  = LEVELS[xpLevel]  || LEVELS[LEVELS.length - 1];
  const next = LEVELS[xpLevel + 1];
  return { cur, next };
}

function renderXP(didLevelUp = false) {
  const { cur, next } = getCurrentLevelData();
  xpLevelEl.textContent = cur.name;
  xpScoreEl.textContent = `${xpTotal} XP`;

  let pct = 100;
  if (next) {
    const span = next.xpRequired - cur.xpRequired;
    const prog = xpTotal - cur.xpRequired;
    pct = Math.min(100, Math.max(0, Math.round((prog / span) * 100)));
  }
  xpFillEl.style.width = `${pct}%`;
  xpTrackEl.setAttribute('aria-valuenow', pct);

  if (didLevelUp) {
    xpLevelEl.classList.remove('xp-level-flash');
    void xpLevelEl.offsetWidth;
    xpLevelEl.classList.add('xp-level-flash');
    xpLevelEl.addEventListener('animationend', () => xpLevelEl.classList.remove('xp-level-flash'), { once: true });
  }
}

function addXP(amount) {
  xpTotal += amount;
  // Check level ups
  let didLevelUp = false;
  while (xpLevel < LEVELS.length - 1 && xpTotal >= LEVELS[xpLevel + 1].xpRequired) {
    xpLevel++;
    didLevelUp = true;
  }
  save(KEY_XP,    xpTotal);
  save(KEY_LEVEL, xpLevel);
  renderXP(didLevelUp);
}

// Focus Streak — counts completed sessions today
function todayString() { return new Date().toISOString().slice(0, 10); }

function getStreak() {
  if (load(KEY_STREAK_DATE) !== todayString()) return 0;
  return load(KEY_STREAK, 0);
}

function incrementStreak() {
  if (load(KEY_STREAK_DATE) !== todayString()) {
    save(KEY_STREAK_DATE, todayString());
    save(KEY_STREAK, 0);
  }
  const next = (load(KEY_STREAK, 0) || 0) + 1;
  save(KEY_STREAK, next);
  streakEl.textContent = next;
}

streakEl.textContent = getStreak();
renderXP();

/* ============================================================
   DATETIME & GREETING  (with dynamic greeting icon)
   ============================================================ */
const datetimeEl    = document.getElementById('datetime');
const greetingEl    = document.getElementById('greeting');
const greetingIcon  = document.getElementById('greetingIcon');

function getGreetingWord(hour) {
  if (hour >= 5  && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function getGreetingIcon(hour) {
  if (hour >= 5  && hour < 12) return '🌅';
  if (hour >= 12 && hour < 17) return '☀️';
  if (hour >= 17 && hour < 21) return '🌆';
  return '🌙';
}

function updateDatetime() {
  const now    = new Date();
  const hour   = now.getHours();
  const name   = load(KEY_NAME, '');

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  datetimeEl.textContent  = `${timeStr}  ·  ${dateStr}`;
  greetingEl.textContent  = name
    ? `${getGreetingWord(hour)}, ${name}! 👋`
    : `${getGreetingWord(hour)}! 👋`;
  greetingIcon.textContent = getGreetingIcon(hour);
}

updateDatetime();
setInterval(updateDatetime, 1000);

/* ============================================================
   CUSTOM NAME (modal)
   ============================================================ */
const nameModal   = document.getElementById('nameModal');
const nameInput   = document.getElementById('nameInput');
const nameSaveBtn = document.getElementById('nameSaveBtn');

function openNameModal() {
  nameInput.value = load(KEY_NAME, '');
  nameModal.classList.remove('hidden');
  nameInput.focus();
}
function closeNameModal() { nameModal.classList.add('hidden'); }

function saveName() {
  const val = nameInput.value.trim();
  if (!val) return;
  save(KEY_NAME, val);
  updateDatetime();
  closeNameModal();
}

nameSaveBtn.addEventListener('click', saveName);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });
nameModal.addEventListener('click', (e) => { if (e.target === nameModal) closeNameModal(); });

if (!load(KEY_NAME)) openNameModal();

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

applyTheme(load(KEY_THEME, 'dark'));

themeToggle.addEventListener('click', () => {
  applyTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   FOCUS TIMER (Pomodoro)
   ============================================================ */
const timerDisplay   = document.getElementById('timerDisplay');
const timerStartBtn  = document.getElementById('timerStart');
const timerStopBtn   = document.getElementById('timerStop');
const timerResetBtn  = document.getElementById('timerReset');
const timerHourIn    = document.getElementById('timerHour');
const timerMinutesIn = document.getElementById('timerMinutes');
const timerSecsIn    = document.getElementById('timerSecs');
const timerSetDurBtn = document.getElementById('timerSetDuration');

let timerTotalSeconds     = load(KEY_TIMER, 25 * 60);
let timerRemainingSeconds = timerTotalSeconds;
let timerInterval         = null;
let timerRunning          = false;

function updateTimerInputs(total) {
  const t = total !== undefined ? total : timerTotalSeconds;
  timerHourIn.value    = Math.floor(t / 3600);
  timerMinutesIn.value = Math.floor((t % 3600) / 60);
  timerSecsIn.value    = t % 60;
}

function renderTimer() {
  const t = Math.max(0, timerRemainingSeconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  timerDisplay.textContent = h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`;
}

function setTimerState(state) {
  timerDisplay.className = 'timer__display';
  if (state === 'running')  timerDisplay.classList.add('running');
  if (state === 'finished') timerDisplay.classList.add('finished');
}

updateTimerInputs();
renderTimer();
setTimerState('idle');

function startTimer() {
  if (timerRunning || timerRemainingSeconds <= 0) return;
  timerRunning = true;
  setTimerState('running');
  timerInterval = setInterval(() => {
    timerRemainingSeconds--;
    renderTimer();
    if (timerRemainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      setTimerState('finished');
      // ── Timer Alarm Sound ──
      playAlarm();
      // ── Streak + XP ──
      incrementStreak();
      addXP(XP_PER_SESSION);
      // ── Browser notification ──
      if (Notification.permission === 'granted') {
        new Notification('Focus session complete! 🎉', { body: 'Time to take a break.' });
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
  timerRemainingSeconds = timerTotalSeconds;
  renderTimer();
  setTimerState('idle');
}

function setCustomDuration() {
  const h = parseInt(timerHourIn.value,    10) || 0;
  const m = parseInt(timerMinutesIn.value, 10) || 0;
  const s = parseInt(timerSecsIn.value,    10) || 0;
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) {
    alert('Masukkan nilai valid (Jam: 0-23, Menit/Detik: 0-59)');
    return;
  }
  const total = h * 3600 + m * 60 + s;
  if (total === 0) { alert('Total waktu harus lebih dari 0.'); return; }
  timerTotalSeconds = total;
  save(KEY_TIMER, timerTotalSeconds);
  resetTimer();
  updateTimerInputs();
}

timerStartBtn.addEventListener('click', startTimer);
timerStopBtn.addEventListener ('click', stopTimer);
timerResetBtn.addEventListener('click', resetTimer);
timerSetDurBtn.addEventListener('click', setCustomDuration);

[timerHourIn, timerMinutesIn, timerSecsIn].forEach((input) => {
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') setCustomDuration(); });
});

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

/* ============================================================
   TO-DO LIST  (priority, due date, counter, clear completed)
   ============================================================ */
const todoForm          = document.getElementById('todoForm');
const todoInput         = document.getElementById('todoInput');
const todoPriorityIn    = document.getElementById('todoPriority');
const todoDueIn         = document.getElementById('todoDue');
const todoListEl        = document.getElementById('todoList');
const todoEmpty         = document.getElementById('todoEmpty');
const todoCounterEl     = document.getElementById('todoCounter');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

/** @type {{ id:string, text:string, done:boolean, priority:string, due:string|null }[]} */
let todos = load(KEY_TODOS, []);

function saveTodos() { save(KEY_TODOS, todos); }

/** Format ISO datetime string to a short readable form. */
function formatDue(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Return true if a due date string is in the past. */
function isOverdue(isoStr) {
  if (!isoStr) return false;
  return new Date(isoStr) < new Date();
}

function updateTodoCounter() {
  const total  = todos.length;
  const done   = todos.filter((t) => t.done).length;
  const active = total - done;
  todoCounterEl.textContent = `Tugas Aktif: ${active} | Selesai: ${done}`;
}

const PRIORITY_LABEL = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };

function renderTodos() {
  todoListEl.innerHTML = '';
  updateTodoCounter();

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

    // Priority badge
    const badge = document.createElement('span');
    badge.className   = `priority-badge priority-badge--${todo.priority || 'medium'}`;
    badge.textContent = PRIORITY_LABEL[todo.priority] || PRIORITY_LABEL.medium;

    // Text
    const span = document.createElement('span');
    span.className   = 'todo__text';
    span.textContent = todo.text;

    // Due date label
    const dueLabel = document.createElement('span');
    const overdue  = isOverdue(todo.due) && !todo.done;
    dueLabel.className   = `todo__due${overdue ? ' todo__due--overdue' : ''}`;
    dueLabel.textContent = todo.due ? `⏰ ${formatDue(todo.due)}${overdue ? ' (Overdue!)' : ''}` : '';

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
    li.append(checkbox, badge, span, dueLabel, actions);
    todoListEl.appendChild(li);
  });
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.push({
    id:       uid(),
    text:     trimmed,
    done:     false,
    priority: todoPriorityIn.value || 'medium',
    due:      todoDueIn.value || null,
  });
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  const wasDone = todo.done;
  todo.done = !todo.done;
  // Award XP when completing a task (not when un-completing)
  if (todo.done && !wasDone) addXP(XP_PER_TASK);
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  renderTodos();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.done);
  saveTodos();
  renderTodos();
}

function startEditTodo(id, liEl, spanEl) {
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

  const actions = liEl.querySelector('.todo__actions');
  actions.style.display = 'none';

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
    if (e.key === 'Escape') renderTodos();
  });

  actions.after(saveBtn);
}

todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(todoInput.value);
  todoInput.value  = '';
  todoDueIn.value  = '';
  todoPriorityIn.value = 'medium';
  todoInput.focus();
});

clearCompletedBtn.addEventListener('click', clearCompleted);

// Re-render every 30 s so overdue status updates without a page reload
setInterval(renderTodos, 30_000);

renderTodos();

/* ============================================================
   QUICK LINKS
   ============================================================ */
const linkForm   = document.getElementById('linkForm');
const linkNameIn = document.getElementById('linkName');
const linkUrlIn  = document.getElementById('linkUrl');
const linksEl    = document.getElementById('linksList');
const linksEmpty = document.getElementById('linksEmpty');

/** @type {{ id:string, name:string, url:string }[]} */
let links = load(KEY_LINKS, []);

function saveLinks() { save(KEY_LINKS, links); }

function faviconUrl(url) {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch { return ''; }
}

function renderLinks() {
  linksEl.innerHTML = '';
  if (links.length === 0) { linksEmpty.classList.remove('hidden'); return; }
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
    delBtn.className   = 'link-chip__delete';
    delBtn.textContent = '✕';
    delBtn.title = `Remove ${link.name}`;
    delBtn.setAttribute('aria-label', `Remove ${link.name}`);
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
  if (!/^https?:\/\//i.test(trimUrl)) trimUrl = 'https://' + trimUrl;
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

renderLinks();
