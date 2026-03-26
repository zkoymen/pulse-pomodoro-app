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

const modeText = document.getElementById('mode-text');
const timeDisplay = document.getElementById('time-display');
const startPauseBtn = document.getElementById('start-pause');
const resetBtn = document.getElementById('reset-btn');
const progressBar = document.getElementById('progress-bar');
const noteInput = document.getElementById('note-input');

const historyList = document.getElementById('history-list');
const refreshHistoryBtn = document.getElementById('refresh-history');

let isFocusMode = true;
let isRunning = false;
let intervalId = null;

let focusMinutes = 25;
let breakMinutes = 5;
let totalSeconds = focusMinutes * 60;
let remainingSeconds = totalSeconds;

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

  modeText.textContent = isFocusMode ? 'Focus' : 'Break';
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
  startPauseBtn.textContent = 'Başlat';
}

async function onModeCompleted() {
  if (isFocusMode) {
    await window.api.addSession({
      focusMinutes,
      breakMinutes,
      note: noteInput.value,
    });

    // Focus bitince break moduna geç.
    isFocusMode = false;
    totalSeconds = breakMinutes * 60;
    remainingSeconds = totalSeconds;
    noteInput.value = '';
    await renderHistory();
  } else {
    // Break bitince focus moduna dön.
    isFocusMode = true;
    totalSeconds = focusMinutes * 60;
    remainingSeconds = totalSeconds;
  }

  stopTimer();
  updateDisplay();
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
  isFocusMode = true;
  resetCurrentMode();
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

async function renderHistory() {
  const sessions = await window.api.getSessions();

  if (!sessions.length) {
    historyList.innerHTML = '<div class="empty">Henüz kayıt yok. Bir focus seansı tamamlayınca burada gözükecek.</div>';
    return;
  }

  historyList.innerHTML = sessions
    .map((s) => {
      const noteHtml = s.note ? `<div class="history-note">Not: ${escapeHtml(s.note)}</div>` : '';
      return `
        <article class="history-item">
          <div class="history-main">
            <strong>${formatDate(s.created_at)}</strong>
            <span>Focus ${s.focus_minutes} dk | Mola ${s.break_minutes} dk</span>
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
renderHistory();
