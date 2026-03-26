const tabTimer = document.getElementById('tab-timer');
const tabHistory = document.getElementById('tab-history');
const timerPage = document.getElementById('timer-page');
const historyPage = document.getElementById('history-page');

const focusInput = document.getElementById('focus-input');
const breakInput = document.getElementById('break-input');
const focusMinus = document.getElementById('focus-minus');
const focusPlus = document.getElementById('focus-plus');
const breakMinus = document.getElementById('break-minus');
const breakPlus = document.getElementById('break-plus');

const timeDisplay = document.getElementById('time-display');
const startPauseBtn = document.getElementById('start-pause');
const resetBtn = document.getElementById('reset-btn');
const progressBar = document.getElementById('progress-bar');
const noteInput = document.getElementById('note-input');
const noteEditBtn = document.getElementById('note-edit-btn');
const noteStatus = document.getElementById('note-status');
const modeFocusBtn = document.getElementById('mode-focus');
const modeBreakBtn = document.getElementById('mode-break');

const historyList = document.getElementById('history-list');
const refreshHistoryBtn = document.getElementById('refresh-history');

let isFocusMode = true;
let isRunning = false;
let intervalId = null;

let focusMinutes = 25;
let breakMinutes = 5;
let totalSeconds = focusMinutes * 60;
let remainingSeconds = totalSeconds;
let noteLocked = false;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function toClock(total) {
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timeDisplay.textContent = toClock(remainingSeconds);

  const done = totalSeconds - remainingSeconds;
  const ratio = totalSeconds > 0 ? (done / totalSeconds) * 100 : 0;
  progressBar.style.width = `${clamp(ratio, 0, 100)}%`;
}

function renderModeButtons() {
  modeFocusBtn.classList.toggle('active', isFocusMode);
  modeBreakBtn.classList.toggle('active', !isFocusMode);
}

function setMode(nextIsFocus) {
  const changed = isFocusMode !== nextIsFocus;
  if (isRunning && changed) {
    stopTimer();
  }
  isFocusMode = nextIsFocus;
  resetCurrentMode();
  renderModeButtons();
}

function syncFromInputs() {
  focusMinutes = clamp(Number(focusInput.value) || 25, 1, 180);
  breakMinutes = clamp(Number(breakInput.value) || 5, 1, 90);
  focusInput.value = focusMinutes;
  breakInput.value = breakMinutes;
}

function resetCurrentMode() {
  syncFromInputs();
  totalSeconds = (isFocusMode ? focusMinutes : breakMinutes) * 60;
  remainingSeconds = totalSeconds;
  updateDisplay();
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  document.body.classList.remove('timer-running');
  startPauseBtn.textContent = 'Başlat';
}

function setNoteLockState(locked) {
  noteLocked = locked;
  noteInput.readOnly = locked;
  noteEditBtn.disabled = !locked;
  noteStatus.textContent = locked
    ? 'Not kaydedildi. Duzenlemek icin Edit tikla.'
    : 'Enter ile notu tamamla.';
}

function getPreparedNote() {
  return (noteInput.value || '').trim();
}

async function onModeCompleted() {
  const sessionType = isFocusMode ? 'focus' : 'break';
  await window.api.addSession({
    focusMinutes,
    breakMinutes,
    sessionType,
    note: isFocusMode ? getPreparedNote() : '',
  });

  if (isFocusMode) {
    noteInput.value = '';
    setNoteLockState(false);
  }

  stopTimer();
  resetCurrentMode();
  await renderHistory();
}

function tick() {
  if (remainingSeconds <= 0) {
    onModeCompleted();
    return;
  }
  remainingSeconds -= 1;
  updateDisplay();
}

function toggleTimer() {
  if (!isRunning) {
    isRunning = true;
    document.body.classList.add('timer-running');
    startPauseBtn.textContent = 'Duraklat';
    intervalId = setInterval(tick, 1000);
    return;
  }

  stopTimer();
}

function adjustInput(input, delta, min, max) {
  const next = clamp((Number(input.value) || min) + delta, min, max);
  input.value = next;
  syncFromInputs();

  if (!isRunning) {
    resetCurrentMode();
  }
}

focusMinus.addEventListener('click', () => adjustInput(focusInput, -1, 1, 180));
focusPlus.addEventListener('click', () => adjustInput(focusInput, 1, 1, 180));
breakMinus.addEventListener('click', () => adjustInput(breakInput, -1, 1, 90));
breakPlus.addEventListener('click', () => adjustInput(breakInput, 1, 1, 90));

focusInput.addEventListener('change', () => {
  syncFromInputs();
  if (!isRunning && isFocusMode) resetCurrentMode();
});

breakInput.addEventListener('change', () => {
  syncFromInputs();
  if (!isRunning && !isFocusMode) resetCurrentMode();
});

startPauseBtn.addEventListener('click', toggleTimer);

resetBtn.addEventListener('click', () => {
  stopTimer();
  setMode(isFocusMode);
  setNoteLockState(false);
});

modeFocusBtn.addEventListener('click', () => setMode(true));
modeBreakBtn.addEventListener('click', () => setMode(false));

noteInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    setNoteLockState(true);
    noteInput.blur();
  }
});

noteEditBtn.addEventListener('click', () => {
  setNoteLockState(false);
  noteInput.focus();
});

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSessionMeta(sessionType) {
  if (sessionType === 'break') {
    return {
      label: 'Break',
      icon: 'cloud',
      className: 'history-tag break',
    };
  }

  return {
    label: 'Focus',
    icon: 'leaf',
    className: 'history-tag focus',
  };
}

async function renderHistory() {
  const sessions = await window.api.getSessions();

  if (!sessions.length) {
    historyList.innerHTML = '<div class="empty">Henüz kayıt yok. Bir focus seansı tamamlayınca burada gözükecek.</div>';
    return;
  }

  historyList.innerHTML = sessions
    .map((s) => {
      const sessionType = s.session_type || 'focus';
      const meta = getSessionMeta(sessionType);
      const noteHtml = s.note ? `<div class="history-note">Not: ${escapeHtml(s.note)}</div>` : '';
      return `
        <article class="history-item">
          <div class="history-main">
            <strong>${formatDate(s.created_at)}</strong>
            <span>${meta.label} | Focus ${s.focus_minutes} dk | Mola ${s.break_minutes} dk</span>
          </div>
          <div class="${meta.className}">
            <span class="history-icon">${meta.icon}</span>
            <span>${meta.label} Session</span>
          </div>
          ${noteHtml}
        </article>
      `;
    })
    .join('');
}

function switchTab(toHistory) {
  tabTimer.classList.toggle('active', !toHistory);
  tabHistory.classList.toggle('active', toHistory);
  timerPage.classList.toggle('active', !toHistory);
  historyPage.classList.toggle('active', toHistory);

  if (toHistory) {
    renderHistory();
  }
}

tabTimer.addEventListener('click', () => switchTab(false));
tabHistory.addEventListener('click', () => switchTab(true));
refreshHistoryBtn.addEventListener('click', renderHistory);

resetCurrentMode();
renderModeButtons();
setNoteLockState(false);
renderHistory();
