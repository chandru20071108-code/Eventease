/**
 * PowerPulse — 1-Click Laptop Shutdown Application Controller
 */

// Application State
const state = {
  currentMode: 'instant', // 'instant', 'buffer5', 'buffer10'
  delaySeconds: 0,
  isDemoMode: false,
  soundEnabled: true,
  audioCtx: null,
  activeTimerInterval: null,
  remainingSeconds: 0,
  totalScheduledSeconds: 0,
  serverOnline: false,
  lanIp: '127.0.0.1',
  port: 7890,
  publicUrl: null,
  authenticatedUrl: null,
  tunnelActive: false,
  accessKey: localStorage.getItem('powerpulse_key') || null,
  qrGenerated: false
};

// Check for ?key= in current URL
const urlParams = new URLSearchParams(window.location.search);
const queryKey = urlParams.get('key');
if (queryKey) {
  state.accessKey = queryKey;
  try {
    localStorage.setItem('powerpulse_key', queryKey);
  } catch (e) {}
  // Clean address bar without reloading
  window.history.replaceState({}, document.title, window.location.pathname);
}

// DOM Elements
const btnMaster = document.getElementById('btnMasterShutdown');
const modeSublabel = document.getElementById('modeSublabel');
const modeChips = document.querySelectorAll('.mode-chip');
const simToggle = document.getElementById('simToggle');
const audioToggle = document.getElementById('audioToggle');
const audioIcon = document.getElementById('audioIcon');
const connectionBadge = document.getElementById('connectionBadge');
const connectionText = document.getElementById('connectionText');

const countdownBanner = document.getElementById('countdownBanner');
const countdownValue = document.getElementById('countdownValue');
const ringProgress = document.getElementById('ringProgress');
const countdownActionTitle = document.getElementById('countdownActionTitle');
const countdownActionDesc = document.getElementById('countdownActionDesc');
const btnAbortBanner = document.getElementById('btnAbortBanner');

const btnRestart = document.getElementById('btnQuickRestart');
const btnSleep = document.getElementById('btnQuickSleep');
const btnLock = document.getElementById('btnQuickLock');

const timerChips = document.querySelectorAll('.timer-chip');
const customTimerForm = document.getElementById('customTimerForm');
const customMinutesInput = document.getElementById('customMinutes');

const hudBatteryPercent = document.getElementById('hudBatteryPercent');
const hudBatteryBar = document.getElementById('hudBatteryBar');
const hudBatteryStatus = document.getElementById('hudBatteryStatus');
const hudHostname = document.getElementById('hudHostname');
const hudOs = document.getElementById('hudOs');
const hudLanIp = document.getElementById('hudLanIp');

const qrUrlDisplay = document.getElementById('qrUrlDisplay');
const btnCopyUrl = document.getElementById('btnCopyUrl');
const cinematicOverlay = document.getElementById('cinematicOverlay');
const btnEmergencyAbort = document.getElementById('btnEmergencyAbort');
const toastContainer = document.getElementById('toastContainer');

// PIN & Tunnel Elements
const tunnelBadge = document.getElementById('tunnelBadge');
const tunnelText = document.getElementById('tunnelText');
const pinModal = document.getElementById('pinModal');
const pinCard = document.getElementById('pinCard');
const pinDots = document.querySelectorAll('.pin-dot');
const pinErrorMsg = document.getElementById('pinErrorMsg');
const keyBtns = document.querySelectorAll('.key-btn');
let currentEnteredPin = '';

/* ==========================================================================
   Web Audio API Sound Synthesizer (Zero External Audio Dependencies)
   ========================================================================== */

function getAudioContext() {
  if (!state.audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      state.audioCtx = new AudioContext();
    }
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may be restricted by autoplay policy before user gesture
  }
}

function playPowerDownSound() {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {}
}

function playAbortChime() {
  if (!state.soundEnabled) return;
  playTone(330, 'triangle', 0.15, 0.2);
  setTimeout(() => playTone(440, 'triangle', 0.15, 0.2), 120);
  setTimeout(() => playTone(660, 'sine', 0.25, 0.25), 240);
}

function playTickSound() {
  playTone(880, 'sine', 0.06, 0.12);
}

/* ==========================================================================
   Toast Notifications
   ========================================================================== */

function showToast(message, type = 'normal') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '⚡';
  if (type === 'success') icon = '✔';
  if (type === 'warning') icon = '⚠';
  if (type === 'info') icon = 'ℹ';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==========================================================================
   API Communication
   ========================================================================== */

async function sendPowerAction(action, delay = 0) {
  const isSim = state.isDemoMode;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.accessKey) {
      headers['X-Access-Key'] = state.accessKey;
    }

    const res = await fetch('/api/action', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        action: action,
        delay: delay,
        simulate: isSim,
        key: state.accessKey
      })
    });

    const data = await res.json();
    if (res.status === 401 || data.unauthorized) {
      showPinModal();
      return { success: false, message: 'Authentication required. Please enter your PIN.' };
    }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: 'Could not connect to laptop backend server.' };
  }
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (!res.ok) throw new Error('Status fetch failed');
    const data = await res.json();
    updateSystemHUD(data);
    setServerStatus(true);
  } catch (err) {
    setServerStatus(false);
  }
}

function setServerStatus(online) {
  state.serverOnline = online;
  if (online) {
    connectionBadge.classList.remove('offline');
    connectionBadge.classList.add('online');
    connectionText.textContent = state.isDemoMode ? 'DEMO ACTIVE' : 'SYSTEM ONLINE';
  } else {
    connectionBadge.classList.remove('online');
    connectionBadge.classList.add('offline');
    connectionText.textContent = 'SERVER OFFLINE';
  }
}

function updateSystemHUD(data) {
  if (!data) return;

  // Battery
  if (data.battery) {
    const pct = data.battery.percent ?? 100;
    hudBatteryPercent.textContent = `${pct}%`;
    hudBatteryBar.style.width = `${pct}%`;

    hudBatteryBar.className = 'hud-progress-fill';
    if (pct <= 20) hudBatteryBar.classList.add('low');
    else if (pct <= 50) hudBatteryBar.classList.add('medium');

    const statusNote = data.battery.charging ? '⚡ Charging plugged in' : data.battery.status_text;
    hudBatteryStatus.textContent = statusNote;
  }

  // Device specs
  if (data.hostname) hudHostname.textContent = data.hostname;
  if (data.os) hudOs.textContent = data.os;
  if (data.lan_ip) {
    state.lanIp = data.lan_ip;
    state.port = data.port || 7890;
    hudLanIp.textContent = `${data.lan_ip}:${state.port}`;
  }

  // Cloudflare Tunnel & Public URL handling
  if (data.tunnel_active && data.public_url) {
    state.tunnelActive = true;
    state.publicUrl = data.public_url;
    state.authenticatedUrl = data.authenticated_url || `${data.public_url}/?key=${state.accessKey || ''}`;

    if (tunnelBadge) {
      tunnelBadge.className = 'tunnel-badge';
      tunnelText.textContent = '24/7 INTERNET LIVE';
    }

    const shareUrl = state.authenticatedUrl;
    qrUrlDisplay.textContent = shareUrl;

    if (!state.qrGenerated || state.currentQrUrl !== shareUrl) {
      generateQrCode(shareUrl);
      state.qrGenerated = true;
      state.currentQrUrl = shareUrl;
    }
  } else {
    state.tunnelActive = false;
    if (tunnelBadge) {
      tunnelBadge.className = 'tunnel-badge connecting';
      tunnelText.textContent = 'TUNNEL CONNECTING...';
    }

    const fallbackUrl = `http://${data.lan_ip || '127.0.0.1'}:${data.port || 7890}`;
    qrUrlDisplay.textContent = fallbackUrl;

    if (!state.qrGenerated) {
      generateQrCode(fallbackUrl);
      state.qrGenerated = true;
      state.currentQrUrl = fallbackUrl;
    }
  }

  // Synchronize scheduled backend shutdown state
  if (data.scheduled && data.scheduled.active) {
    if (!state.activeTimerInterval) {
      startCountdownUI(
        data.scheduled.remaining_seconds,
        data.scheduled.total_seconds || data.scheduled.remaining_seconds,
        data.scheduled.last_action || 'shutdown'
      );
    }
  } else if (!data.scheduled || !data.scheduled.active) {
    // If backend reports no scheduled shutdown and we aren't in a local buffer count
    if (state.activeTimerInterval && state.remainingSeconds > 10) {
      stopCountdownUI();
    }
  }
}

function generateQrCode(url) {
  const container = document.getElementById('qrcode');
  if (!container) return;
  container.innerHTML = '';
  try {
    new QRCode(container, {
      text: url,
      width: 94,
      height: 94,
      colorDark: "#090a0f",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {
    console.warn("QR code render notice:", e);
  }
}

/* ==========================================================================
   Countdown Progress & Abort Banner
   ========================================================================== */

const RING_CIRCUMFERENCE = 2 * Math.PI * 50; // r=50 -> ~314.159

function startCountdownUI(seconds, totalSeconds = seconds, actionType = 'shutdown') {
  if (state.activeTimerInterval) {
    clearInterval(state.activeTimerInterval);
  }

  state.remainingSeconds = seconds;
  state.totalScheduledSeconds = totalSeconds;

  countdownBanner.classList.remove('hidden');

  let title = 'Laptop Shutting Down Soon';
  let desc = 'System power-off is scheduled. Click abort below to cancel.';
  if (actionType === 'restart') {
    title = 'Laptop Rebooting Soon';
    desc = 'System restart scheduled. Click abort below to cancel.';
  }

  countdownActionTitle.textContent = title;
  countdownActionDesc.textContent = desc;

  updateRingDisplay(seconds, totalSeconds);

  state.activeTimerInterval = setInterval(() => {
    state.remainingSeconds--;

    if (state.remainingSeconds <= 0) {
      clearInterval(state.activeTimerInterval);
      state.activeTimerInterval = null;
      countdownBanner.classList.add('hidden');

      if (!state.isDemoMode) {
        showCinematicOverlay();
      } else {
        showToast('[DEMO] Simulated shutdown completed.', 'info');
      }
      return;
    }

    if (state.remainingSeconds <= 5) {
      playTickSound();
    }

    updateRingDisplay(state.remainingSeconds, state.totalScheduledSeconds);
  }, 1000);
}

function updateRingDisplay(remaining, total) {
  countdownValue.textContent = formatRemaining(remaining);

  const safeTotal = Math.max(total, 1);
  const progressRatio = Math.max(0, Math.min(1, remaining / safeTotal));
  const dashoffset = RING_CIRCUMFERENCE * (1 - progressRatio);
  ringProgress.style.strokeDashoffset = dashoffset;
}

function formatRemaining(sec) {
  if (sec < 60) return sec.toString();
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function stopCountdownUI() {
  if (state.activeTimerInterval) {
    clearInterval(state.activeTimerInterval);
    state.activeTimerInterval = null;
  }
  countdownBanner.classList.add('hidden');
}

/* ==========================================================================
   User Action Handlers
   ========================================================================== */

// 1. One-Click Master Shutdown Button
async function handleMasterShutdown() {
  playTone(220, 'sine', 0.1, 0.2);

  const mode = state.currentMode;
  const isSim = state.isDemoMode;

  if (mode === 'instant') {
    // Pure 1-Click Instant Shutdown (0s delay)
    playPowerDownSound();
    showCinematicOverlay();

    const res = await sendPowerAction('shutdown', 0);
    if (!res.success && !isSim) {
      showToast(res.message, 'warning');
      hideCinematicOverlay();
    } else {
      showToast(res.message, 'success');
    }
  } else {
    // Safety buffer countdown (5s or 10s)
    const delay = state.delaySeconds || 5;
    playTone(550, 'triangle', 0.15, 0.2);

    startCountdownUI(delay, delay, 'shutdown');

    // Send scheduled shutdown command to Windows
    const res = await sendPowerAction('shutdown', delay);
    if (res.success) {
      showToast(res.message, 'info');
    } else {
      showToast(res.message, 'warning');
    }
  }
}

// 2. Abort Action
async function handleAbort() {
  playAbortChime();
  stopCountdownUI();
  hideCinematicOverlay();

  const res = await sendPowerAction('abort');
  showToast(res.message || 'Shutdown aborted!', 'success');
}

// 3. Quick Actions (Restart, Sleep, Lock)
async function handleQuickAction(action) {
  playTone(400, 'sine', 0.1, 0.15);

  if (action === 'restart') {
    if (state.currentMode === 'instant') {
      const res = await sendPowerAction('restart', 0);
      showToast(res.message, res.success ? 'success' : 'warning');
    } else {
      const delay = state.delaySeconds || 5;
      startCountdownUI(delay, delay, 'restart');
      const res = await sendPowerAction('restart', delay);
      showToast(res.message, res.success ? 'info' : 'warning');
    }
  } else if (action === 'sleep') {
    showToast('Entering sleep mode...', 'info');
    const res = await sendPowerAction('sleep');
    if (!res.success) showToast(res.message, 'warning');
  } else if (action === 'lock') {
    showToast('Screen locked.', 'success');
    const res = await sendPowerAction('lock');
    if (!res.success) showToast(res.message, 'warning');
  }
}

// 4. Sleep Timer Presets
async function scheduleTimerMinutes(minutes) {
  const mins = parseInt(minutes, 10);
  if (isNaN(mins) || mins <= 0) return;

  const seconds = mins * 60;
  playTone(600, 'sine', 0.15, 0.2);

  startCountdownUI(seconds, seconds, 'shutdown');
  const res = await sendPowerAction('shutdown', seconds);

  if (res.success) {
    showToast(`Laptop will shut down in ${mins} minutes.`, 'success');
  } else {
    showToast(res.message, 'warning');
  }
}

/* ==========================================================================
   Overlay & Helpers
   ========================================================================== */

function showCinematicOverlay() {
  cinematicOverlay.classList.remove('hidden');
}

function hideCinematicOverlay() {
  cinematicOverlay.classList.add('hidden');
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

// Master Shutdown Button
btnMaster.addEventListener('click', handleMasterShutdown);

// Abort buttons
btnAbortBanner.addEventListener('click', handleAbort);
btnEmergencyAbort.addEventListener('click', handleAbort);

// Mode selector chips
modeChips.forEach(chip => {
  chip.addEventListener('click', () => {
    modeChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    state.currentMode = chip.dataset.mode;
    state.delaySeconds = parseInt(chip.dataset.delay, 10) || 0;

    if (state.currentMode === 'instant') {
      modeSublabel.textContent = '1-CLICK INSTANT';
    } else if (state.currentMode === 'buffer5') {
      modeSublabel.textContent = '5-SEC SAFETY WINDOW';
    } else {
      modeSublabel.textContent = '10-SEC SAFETY WINDOW';
    }

    playTone(700, 'sine', 0.05, 0.1);
  });
});

// Quick power actions
btnRestart.addEventListener('click', () => handleQuickAction('restart'));
btnSleep.addEventListener('click', () => handleQuickAction('sleep'));
btnLock.addEventListener('click', () => handleQuickAction('lock'));

// Sleep timer chips
timerChips.forEach(chip => {
  chip.addEventListener('click', () => {
    scheduleTimerMinutes(chip.dataset.minutes);
  });
});

// Custom timer form
customTimerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = customMinutesInput.value;
  if (val) {
    scheduleTimerMinutes(val);
    customMinutesInput.value = '';
  }
});

// Demo mode toggle
simToggle.addEventListener('change', (e) => {
  state.isDemoMode = e.target.checked;
  if (state.isDemoMode) {
    showToast('Demo Mode enabled: commands will be simulated safely.', 'info');
  } else {
    showToast('Live Mode active: commands will execute on Windows.', 'warning');
  }
  setServerStatus(state.serverOnline);
});

// Sound toggle
audioToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) {
    audioToggle.style.color = '#fff';
    playTone(520, 'sine', 0.1, 0.2);
    showToast('Sound effects enabled', 'info');
  } else {
    audioToggle.style.color = 'var(--text-muted)';
    showToast('Sound effects muted', 'info');
  }
});

// Copy URL button
btnCopyUrl.addEventListener('click', () => {
  const url = qrUrlDisplay.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Copied URL to clipboard!', 'success');
    });
  } else {
    showToast(`URL: ${url}`, 'info');
  }
});

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  // If PIN Modal is open, redirect keystrokes to PIN input
  if (pinModal && !pinModal.classList.contains('hidden')) {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handlePinInput(e.key);
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      handlePinInput('back');
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handlePinInput('clear');
      return;
    }
  }

  // ESC cancels shutdown immediately
  if (e.key === 'Escape') {
    handleAbort();
    return;
  }

  // Avoid shortcuts when typing in inputs
  if (document.activeElement.tagName === 'INPUT') return;

  // Space triggers shutdown
  if (e.code === 'Space') {
    e.preventDefault();
    handleMasterShutdown();
  }
});

/* ==========================================================================
   PIN Authentication Controller
   ========================================================================== */

function showPinModal() {
  if (!pinModal) return;
  currentEnteredPin = '';
  updatePinDots();
  if (pinErrorMsg) pinErrorMsg.textContent = '';
  pinModal.classList.remove('hidden');
}

function hidePinModal() {
  if (!pinModal) return;
  pinModal.classList.add('hidden');
  currentEnteredPin = '';
  updatePinDots();
}

function updatePinDots() {
  if (!pinDots) return;
  pinDots.forEach((dot, idx) => {
    if (idx < currentEnteredPin.length) {
      dot.classList.add('filled');
      dot.classList.remove('error');
    } else {
      dot.classList.remove('filled', 'error');
    }
  });
}

async function handlePinInput(val) {
  if (val === 'clear') {
    currentEnteredPin = '';
    if (pinErrorMsg) pinErrorMsg.textContent = '';
    updatePinDots();
    playTone(350, 'sine', 0.05, 0.1);
    return;
  }

  if (val === 'back') {
    if (currentEnteredPin.length > 0) {
      currentEnteredPin = currentEnteredPin.slice(0, -1);
      if (pinErrorMsg) pinErrorMsg.textContent = '';
      updatePinDots();
      playTone(400, 'sine', 0.05, 0.1);
    }
    return;
  }

  // Digit input
  if (currentEnteredPin.length < 4) {
    currentEnteredPin += val;
    playTone(600 + currentEnteredPin.length * 60, 'sine', 0.05, 0.15);
    updatePinDots();

    if (currentEnteredPin.length === 4) {
      await verifyPinAttempt(currentEnteredPin);
    }
  }
}

async function verifyPinAttempt(pin) {
  try {
    const res = await fetch('/api/verify-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin })
    });

    const data = await res.json();
    if (res.ok && data.valid) {
      state.accessKey = data.token;
      try {
        localStorage.setItem('powerpulse_key', data.token);
      } catch (e) {}

      playTone(523.25, 'triangle', 0.1, 0.2);
      setTimeout(() => playTone(659.25, 'triangle', 0.1, 0.2), 100);
      setTimeout(() => playTone(783.99, 'sine', 0.2, 0.25), 200);

      hidePinModal();
      showToast('PIN verified! Full remote control granted.', 'success');
      fetchStatus();
    } else {
      playTone(200, 'sawtooth', 0.2, 0.2);
      if (pinErrorMsg) pinErrorMsg.textContent = data.message || 'Incorrect PIN. Try again.';
      pinDots.forEach(dot => dot.classList.add('error'));
      if (pinCard) {
        pinCard.classList.remove('shake');
        void pinCard.offsetWidth;
        pinCard.classList.add('shake');
      }
      setTimeout(() => {
        currentEnteredPin = '';
        updatePinDots();
      }, 700);
    }
  } catch (err) {
    if (pinErrorMsg) pinErrorMsg.textContent = 'Server unreachable. Please check connection.';
  }
}

// Bind keypad buttons
if (keyBtns) {
  keyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      handlePinInput(key);
    });
  });
}

/* ==========================================================================
   Initialization
   ========================================================================== */

// Initial ring SVG dash array
ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
ringProgress.style.strokeDashoffset = 0;

// Fetch initial status and poll every 4 seconds
fetchStatus();
setInterval(fetchStatus, 4000);

