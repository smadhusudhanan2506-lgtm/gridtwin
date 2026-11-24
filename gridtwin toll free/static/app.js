/**
 * GRIDTWIN Toll-Free Webphone & Dialpad Controller
 * 
 * Handles:
 * - DTMF tone generation & keypress dispatch
 * - Browser Web Speech API & Real Edge Neural Voice (Tamil, English, Hindi)
 * - 2-Way Real-time Tower Telemetry & Isolation Sync with 3D Digital Twin
 * - Real-time call transcript & DTMF logging
 */

// Application State
let callActive = false;
let callTimerInterval = null;
let callDurationSec = 0;
let currentStage = "IDLE"; // IDLE, LANGUAGE_SELECTION, TOWER_SELECTION, MENU_OPTIONS, CALL_ENDED
let selectedLanguage = "en";
let audioContext = null;

// DOM Elements
const btnStartCall = document.getElementById("btnStartCall");
const btnHangup = document.getElementById("btnHangup");
const phoneDisplayText = document.getElementById("phoneDisplayText");
const callStatusText = document.getElementById("callStatusText");
const callStatusDot = document.getElementById("callStatusDot");
const callTimer = document.getElementById("callTimer");
const speakerVisualizer = document.getElementById("speakerVisualizer");
const speechBubble = document.getElementById("speechBubble");
const chkAudioSpeech = document.getElementById("chkAudioSpeech");
const transcriptLog = document.getElementById("transcriptLog");
const towerCardsContainer = document.getElementById("towerCardsContainer");
const btnClearLog = document.getElementById("btnClearLog");

// Caller Identity & Access Control Elements
const selCallerNumber = document.getElementById("selCallerNumber");
const txtCustomCaller = document.getElementById("txtCustomCaller");
const btnSetCustomCaller = document.getElementById("btnSetCustomCaller");
const badgeCallerType = document.getElementById("badgeCallerType");
const frmAddNumber = document.getElementById("frmAddNumber");
const txtRegPhone = document.getElementById("txtRegPhone");
const txtRegName = document.getElementById("txtRegName");
const selRegRole = document.getElementById("selRegRole");
const tblRegisteredBody = document.getElementById("tblRegisteredBody");
const statTotalRegistered = document.getElementById("statTotalRegistered");
const statActiveRegistered = document.getElementById("statActiveRegistered");
const statBlockedRegistered = document.getElementById("statBlockedRegistered");

let currentCallerNumber = "+15738595176";
let registeredNumbersCache = [];

// DTMF Frequencies (Row & Col)
const DTMF_FREQS = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

// Play DTMF dual tone in browser
function playDtmfTone(key) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const freqs = DTMF_FREQS[key];
    if (!freqs) return;

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioContext.currentTime + 0.15);
    osc2.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    console.debug("Audio tone error:", e);
  }
}

// Browser Text-to-Speech & Real Neural Voice Player
let currentAudioPlayer = null;

function stopAllAudio() {
  if (currentAudioPlayer) {
    try {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
    } catch (e) {}
    currentAudioPlayer = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (speakerVisualizer) speakerVisualizer.classList.remove("speaking");
  if (speechBubble) speechBubble.textContent = "Voice speaker ready";
}

function playRealVoice(audioUrl, fallbackText, lang = "en-IN", callback = null) {
  if (!chkAudioSpeech || !chkAudioSpeech.checked) {
    if (callback) callback();
    return;
  }

  stopAllAudio();

  if (speakerVisualizer) speakerVisualizer.classList.add("speaking");
  if (speechBubble) speechBubble.textContent = `Speaking (${lang.split('-')[0]})...`;

  if (audioUrl) {
    currentAudioPlayer = new Audio(audioUrl);
    currentAudioPlayer.onended = () => {
      stopAllAudio();
      if (callback) callback();
    };
    currentAudioPlayer.onerror = () => {
      console.warn("Real neural audio failed, falling back to Web Speech:", audioUrl);
      playFallbackWebSpeech(fallbackText, lang, callback);
    };
    currentAudioPlayer.play().catch(err => {
      console.warn("Audio autoplay blocked, falling back:", err);
      playFallbackWebSpeech(fallbackText, lang, callback);
    });
  } else {
    playFallbackWebSpeech(fallbackText, lang, callback);
  }
}

function playFallbackWebSpeech(text, lang = "en-IN", callback = null) {
  if (!('speechSynthesis' in window) || !chkAudioSpeech.checked) {
    stopAllAudio();
    if (callback) callback();
    return;
  }

  const cleanText = text.replace(/\[OPTIONS\].*$/, "").trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang.split("-")[0];
  const matchedVoice = voices.find(v => v.lang.startsWith(langPrefix) || v.lang === lang);
  if (matchedVoice) utterance.voice = matchedVoice;

  utterance.onend = () => {
    stopAllAudio();
    if (callback) callback();
  };
  utterance.onerror = () => {
    stopAllAudio();
    if (callback) callback();
  };

  window.speechSynthesis.speak(utterance);
}

// ──────────────────────────────────────────────
// Call Transcript Logging
// ──────────────────────────────────────────────

function addTranscript(type, msg) {
  if (!transcriptLog) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="time">${timeStr}</span><span class="msg">${escapeHtml(msg)}</span>`;
  transcriptLog.appendChild(entry);
  transcriptLog.scrollTop = transcriptLog.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Timer Functions
function startTimer() {
  callDurationSec = 0;
  if (callTimer) callTimer.textContent = "(00:00)";
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callDurationSec++;
    const m = String(Math.floor(callDurationSec / 60)).padStart(2, '0');
    const s = String(callDurationSec % 60).padStart(2, '0');
    if (callTimer) callTimer.textContent = `(${m}:${s})`;
  }, 1000);
}

function stopTimer() {
  clearInterval(callTimerInterval);
  if (callTimer) callTimer.textContent = "";
}

// ──────────────────────────────────────────────
// Call Lifecycle Actions
// ──────────────────────────────────────────────

async function startCall() {
  try {
    const callerNumber = selCallerNumber ? selCallerNumber.value : (currentCallerNumber || "+15738595176");
    currentCallerNumber = callerNumber;

    addTranscript("caller", `📞 Calling +1 573 859 5176 from [${callerNumber}]...`);
    if (callStatusText) callStatusText.textContent = "Connecting hotline...";
    if (callStatusDot) callStatusDot.className = "status-dot-green pulsing";
    btnStartCall.disabled = true;
    btnHangup.disabled = false;

    const res = await fetch("/api/simulator/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caller_number: callerNumber })
    });
    const data = await res.json();

    // Check Access Authorization Status
    if (data.status === "rejected" || !data.authorized) {
      callActive = false;
      stopTimer();
      if (callStatusText) callStatusText.textContent = `Call Rejected (${data.reason})`;
      if (callStatusDot) callStatusDot.className = "status-dot-green";
      if (phoneDisplayText) phoneDisplayText.textContent = data.display_text;

      addTranscript("alert", `❌ ACCESS DENIED: ${data.caller_name || callerNumber} (${data.reason})`);
      addTranscript("ivr", data.speech?.text || data.display_text);

      btnStartCall.disabled = false;
      btnHangup.disabled = true;

      if (chkAudioSpeech && chkAudioSpeech.checked && data.speech) {
        playRealVoice(data.audio_url, data.speech.text, data.speech.lang, () => {
          setTimeout(hangupCall, 2000);
        });
      } else {
        setTimeout(hangupCall, 3500);
      }
      fetchCallLogs();
      return;
    }

    callActive = true;
    startTimer();
    if (callStatusText) callStatusText.textContent = "Call Connected";
    currentStage = "LANGUAGE_SELECTION";
    if (phoneDisplayText) phoneDisplayText.textContent = data.display_text;

    addTranscript("ivr", `Connected: ${data.caller_name || "Authorized Caller"}`);
    addTranscript("ivr", "Prompt: 1 for Tamil | 2 for English | 3 for Hindi");

    if (chkAudioSpeech && chkAudioSpeech.checked && data.speech_prompts) {
      playWelcomeSequence(data.speech_prompts);
    }
    fetchCallLogs();

  } catch (err) {
    console.error("Call error:", err);
    addTranscript("alert", "Failed to connect to IVR server: " + err.message);
    hangupCall();
  }
}

function playWelcomeSequence(prompts) {
  if (!prompts || prompts.length === 0) return;
  function playNext(index) {
    if (index >= prompts.length || !callActive) return;
    const p = prompts[index];
    playRealVoice(p.audio_url, p.text, p.lang, () => {
      setTimeout(() => playNext(index + 1), 350);
    });
  }
  playNext(0);
}

function hangupCall() {
  callActive = false;
  stopTimer();
  stopAllAudio();
  
  if (callStatusText) callStatusText.textContent = "Ready to Call";
  if (callStatusDot) callStatusDot.className = "status-dot-green";
  if (phoneDisplayText) {
    phoneDisplayText.textContent = "Press the green \"Call Toll-Free\" button below to test the IVR system.";
  }
  
  btnStartCall.disabled = false;
  btnHangup.disabled = true;
  currentStage = "IDLE";
  
  addTranscript("system", "📴 Call disconnected.");
}

// Handle Dialpad Key Presses
async function handleKeyPress(key) {
  playDtmfTone(key);

  if (!callActive) {
    addTranscript("system", `Key [${key}] pressed while phone is on-hook.`);
    return;
  }

  addTranscript("caller", `👉 Caller pressed: [${key}]`);

  try {
    const payload = {
      digit: key,
      stage: currentStage,
      lang: selectedLanguage,
      caller_number: currentCallerNumber
    };

    const res = await fetch("/api/simulator/dtmf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (!result.success && result.error) {
      if (phoneDisplayText) phoneDisplayText.textContent = result.display_text;
      addTranscript("alert", result.display_text);
      if (result.speech) {
        playRealVoice(result.audio_url, result.speech.text, result.speech.lang);
      }
      return;
    }

    currentStage = result.stage;
    if (result.lang) selectedLanguage = result.lang;

    if (phoneDisplayText) phoneDisplayText.textContent = result.display_text;
    addTranscript("ivr", result.display_text);

    if (result.speech) {
      playRealVoice(result.audio_url, result.speech.text, result.speech.lang);
    }

    if (currentStage === "CALL_ENDED") {
      setTimeout(hangupCall, 4000);
    }

    if (result.tower_data) {
      fetchTowersStatus();
      fetchCallLogs();
    }

  } catch (err) {
    console.error("DTMF error:", err);
    addTranscript("alert", "Error processing DTMF: " + err.message);
  }
}

// ──────────────────────────────────────────────
// SVG Transmission Tower Graphics (Lattice Pylon)
// ──────────────────────────────────────────────

function getTowerSvg(isIsolated) {
  if (isIsolated) {
    return `
      <svg class="pylon-graphic" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g-mound-iso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7f1d1d" />
            <stop offset="100%" stop-color="#450a0a" />
          </linearGradient>
          <filter id="glow-iso" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Ground Base Mound (Red Alert) -->
        <ellipse cx="80" cy="112" rx="68" ry="7" fill="url(#g-mound-iso)" opacity="0.95" />
        <path d="M15 112 Q80 108 145 112" stroke="#ef4444" stroke-width="2.2" fill="none" opacity="0.85" />
        
        <!-- Disconnected Dashed Power Lines (Red) -->
        <path d="M0 45 L48 49" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />
        <path d="M112 49 L160 45" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />
        <path d="M0 65 L40 68" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />
        <path d="M120 68 L160 65" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />

        <!-- Tower Lattice Structure (Glowing Intense Red Pylon When Isolated) -->
        <g stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-iso)">
          <!-- Main Legs -->
          <line x1="56" y1="112" x2="74" y2="24" />
          <line x1="104" y1="112" x2="86" y2="24" />
          <!-- Peak -->
          <line x1="74" y1="24" x2="80" y2="8" />
          <line x1="86" y1="24" x2="80" y2="8" />
          <!-- Crossarms -->
          <line x1="48" y1="45" x2="112" y2="45" />
          <line x1="38" y1="65" x2="122" y2="65" />
          <!-- Cross Bracing -->
          <line x1="60" y1="96" x2="100" y2="96" />
          <line x1="60" y1="96" x2="96" y2="80" />
          <line x1="100" y1="96" x2="64" y2="80" />
          <line x1="64" y1="80" x2="96" y2="80" />
          <line x1="67" y1="65" x2="93" y2="65" />
          <line x1="70" y1="45" x2="90" y2="45" />
          <line x1="80" y1="8" x2="80" y2="45" stroke-width="1.6" opacity="0.8" />
        </g>

        <!-- Isolation Cut-Off Warning Badge -->
        <circle cx="80" cy="55" r="14" fill="#991b1b" stroke="#f87171" stroke-width="2" />
        <text x="80" y="60.5" text-anchor="middle" fill="#fee2e2" font-size="13" font-weight="900" font-family="sans-serif">✕</text>
      </svg>
    `;
  } else {
    return `
      <svg class="pylon-graphic" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g-mound-act" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284c7" />
            <stop offset="100%" stop-color="#082f49" />
          </linearGradient>
          <filter id="glow-act" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Ground Base Mound (Electric Blue Terrain) -->
        <ellipse cx="80" cy="112" rx="68" ry="7" fill="url(#g-mound-act)" opacity="0.9" />
        <path d="M15 112 Q80 108 145 112" stroke="#38bdf8" stroke-width="2.2" fill="none" opacity="0.85" />
        
        <!-- Continuous High-Voltage Power Lines (Cyan/Blue) -->
        <path d="M0 45 Q80 50 160 45" stroke="#38bdf8" stroke-width="2" fill="none" opacity="0.9" />
        <path d="M0 65 Q80 70 160 65" stroke="#38bdf8" stroke-width="2" fill="none" opacity="0.9" />

        <!-- Tower Lattice Structure (Electric Blue Pylon - Changes to Red on Isolation) -->
        <g stroke="#00d2ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-act)">
          <!-- Main Legs -->
          <line x1="56" y1="112" x2="74" y2="24" />
          <line x1="104" y1="112" x2="86" y2="24" />
          <!-- Peak -->
          <line x1="74" y1="24" x2="80" y2="8" />
          <line x1="86" y1="24" x2="80" y2="8" />
          <!-- Crossarms -->
          <line x1="48" y1="45" x2="112" y2="45" />
          <line x1="38" y1="65" x2="122" y2="65" />
          <!-- Cross Bracing Lattice -->
          <line x1="60" y1="96" x2="100" y2="96" />
          <line x1="60" y1="96" x2="96" y2="80" />
          <line x1="100" y1="96" x2="64" y2="80" />
          <line x1="64" y1="80" x2="96" y2="80" />
          <line x1="67" y1="65" x2="93" y2="65" />
          <line x1="70" y1="45" x2="90" y2="45" />
          <!-- Vertical center apex -->
          <line x1="80" y1="8" x2="80" y2="45" stroke-width="1.6" opacity="0.8" />
        </g>
      </svg>
    `;
  }
}

// ──────────────────────────────────────────────
// Live Towers Telemetry Polling (Every 1.5s)
// ──────────────────────────────────────────────

async function fetchTowersStatus() {
  try {
    const res = await fetch("/api/towers");
    const data = await res.json();
    renderTowerCards(data);
  } catch (err) {
    console.warn("Unable to fetch towers status:", err);
  }
}

function renderTowerCards(towers) {
  if (!towers || Object.keys(towers).length === 0 || !towerCardsContainer) return;

  const isolatedList = [];
  for (const [num, t] of Object.entries(towers)) {
    if (t.is_isolated) {
      isolatedList.push(`Tower ${num} (${t.tower_id})`);
    }
  }

  // Update Dynamic Grid Summary Alert Banner
  const alertBar = document.getElementById("gridStatusAlertBar");
  const alertIcon = document.getElementById("gridAlertIcon");
  const alertText = document.getElementById("gridAlertText");
  if (alertBar && alertText) {
    if (isolatedList.length > 0) {
      alertBar.className = "grid-status-alert-bar has-isolation";
      if (alertIcon) alertIcon.textContent = "🚨";
      alertText.textContent = `Fault Isolation Detected – ${isolatedList.join(", ")} is currently ISOLATED. Power supply is cut off. Real-time telemetry in sync with 3D Twin.`;
    } else {
      alertBar.className = "grid-status-alert-bar all-normal";
      if (alertIcon) alertIcon.textContent = "✔";
      alertText.textContent = "All Towers Normal – 5/5 towers active and transmitting power. Normal line flow.";
    }
  }

  let html = "";
  for (const [num, t] of Object.entries(towers)) {
    const isIsolated = t.is_isolated;
    const cardClass = isIsolated ? "isolated" : "normal";
    const badgeClass = isIsolated ? "badge-isolated" : "badge-normal";
    const badgeText = isIsolated ? "ISOLATED" : "ACTIVE";
    
    const currentVal = isIsolated ? "0.0 mA" : `${(Number(t.current_ma) || 0).toFixed(1)} mA`;
    const voltageVal = isIsolated ? "0.0 V" : `${(Number(t.voltage_v) || 0).toFixed(2)} V`;
    const statusText = isIsolated ? "✖ Line Cut Off (Isolated)" : "✔ Live Transmission";
    
    const toggleBtnText = isIsolated ? "⚡ Restore" : "⚙ Isolate";
    const toggleBtnClass = isIsolated ? "restore-btn" : "isolate-btn";

    html += `
      <div class="tower-card ${cardClass}" id="card-tower-${num}">
        <div class="tower-card-top">
          <span class="tower-title">Tower ${t.tower_number} (${t.tower_id})</span>
          <span class="tower-badge ${badgeClass}"><span class="badge-dot"></span>${badgeText}</span>
        </div>
        
        <div class="tower-graphic-box">
          ${getTowerSvg(isIsolated)}
        </div>

        <div class="tower-metrics-list">
          <div class="metric-row">
            <span class="metric-label">Line Current:</span>
            <span class="metric-value-current ${isIsolated ? 'isolated' : ''}">${currentVal}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Bus Voltage:</span>
            <span class="metric-value-volt">${voltageVal}</span>
          </div>
          <div class="transmission-status ${isIsolated ? 'isolated' : 'active'}">
            ${statusText}
          </div>
        </div>

        <div class="tower-card-actions">
          <button class="tower-card-btn btn-card-dial" onclick="quickDialTower('${num}')" title="Dial and query Tower ${num}">
            📞 Dial T${num}
          </button>
          <button class="tower-card-btn btn-card-toggle ${toggleBtnClass}" onclick="toggleTowerIsolation('${t.tower_id}', ${isIsolated})" title="2-way toggle with 3D Twin">
            ${toggleBtnText}
          </button>
        </div>
      </div>
    `;
  }
  towerCardsContainer.innerHTML = html;
}

// 2-Way Command Dispatch: Toll-Free UI -> Digital Twin Backend
async function toggleTowerIsolation(towerId, currentIsIsolated) {
  const endpoint = currentIsIsolated ? `/api/towers/${towerId}/restore` : `/api/towers/${towerId}/isolate`;
  const backendUrl = "https://gridtwin-backend.onrender.com/api/v1/hardware/" + (currentIsIsolated ? "restore" : "isolate") + "/" + towerId;
  try {
    await fetch(endpoint, { method: "POST" });
    fetch(backendUrl, { method: "POST" }).catch(() => {});
    addTranscript("system", `[2-WAY SYNC] Tower ${towerId} ${currentIsIsolated ? "RESTORED" : "ISOLATED"} from Toll-Free UI -> Sent to Digital Twin.`);
    fetchTowersStatus();
  } catch (e) {
    console.error("Toggle error:", e);
    addTranscript("alert", `Failed to command Tower ${towerId}: ${e.message}`);
  }
}

// One-click quick dial a specific tower on the hotline
function quickDialTower(towerNum) {
  if (!callActive) {
    startCall().then(() => {
      setTimeout(() => handleKeyPress("2"), 500);       // Select English
      setTimeout(() => handleKeyPress(towerNum), 1200);   // Select Tower
    });
  } else {
    handleKeyPress(towerNum);
  }
}

// Make accessible to window for inline onclick handlers
window.toggleTowerIsolation = toggleTowerIsolation;
window.quickDialTower = quickDialTower;

// ──────────────────────────────────────────────
// Event Listeners
// ──────────────────────────────────────────────

if (btnStartCall) btnStartCall.addEventListener("click", startCall);
if (btnHangup) btnHangup.addEventListener("click", hangupCall);

document.querySelectorAll(".key-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-key");
    handleKeyPress(key);
  });
});

window.addEventListener("keydown", (e) => {
  const allowed = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "#"];
  if (allowed.includes(e.key)) {
    const btn = document.querySelector(`.key-btn[data-key="${e.key}"]`);
    if (btn) {
      btn.classList.add("active");
      setTimeout(() => btn.classList.remove("active"), 150);
    }
    handleKeyPress(e.key);
  }
});

if (btnClearLog) {
  btnClearLog.addEventListener("click", () => {
    if (transcriptLog) {
      transcriptLog.innerHTML = `<div class="log-entry system"><span class="time">&gt;</span><span class="msg">Log cleared.</span></div>`;
    }
  });
}

// ──────────────────────────────────────────────
// Authorized Numbers Management & Access Control
// ──────────────────────────────────────────────

async function fetchRegisteredNumbers() {
  try {
    const res = await fetch("/api/registered-numbers");
    if (!res.ok) return;
    const data = await res.json();
    registeredNumbersCache = data.numbers || [];
    renderRegisteredNumbersTable(registeredNumbersCache);
    updateCallerSelectOptions(registeredNumbersCache);
  } catch (e) {
    console.debug("Failed to fetch registered numbers:", e);
  }
}

function updateCallerSelectOptions(numbers) {
  if (!selCallerNumber) return;
  const currentVal = selCallerNumber.value;
  let optionsHtml = "";

  for (const item of numbers) {
    const isBlocked = (item.status === "BLOCKED");
    const statusTag = isBlocked ? " [BLOCKED ⛔]" : " [ACTIVE ✔]";
    const icon = isBlocked ? "🚫 " : "📱 ";
    optionsHtml += `<option value="${escapeHtml(item.phone_number)}" ${item.phone_number === currentVal ? "selected" : ""}>
      ${icon}${escapeHtml(item.phone_number)} (${escapeHtml(item.display_name)}) ${statusTag}
    </option>`;
  }

  // Add test unregistered numbers for testing call rejection
  optionsHtml += `
    <option value="+919999900000" ${currentVal === "+919999900000" ? "selected" : ""}>
      ⛔ +91 99999 00000 (Unregistered Stranger - Test Rejection)
    </option>
    <option value="+18000009999" ${currentVal === "+18000009999" ? "selected" : ""}>
      ⛔ +1 800 000 9999 (Unregistered International - Test Rejection)
    </option>
  `;

  selCallerNumber.innerHTML = optionsHtml;
  updateCallerBadge();
}

function updateCallerBadge() {
  if (!selCallerNumber || !badgeCallerType) return;
  const selectedPhone = selCallerNumber.value;
  const matched = registeredNumbersCache.find(r => r.phone_number === selectedPhone);

  badgeCallerType.className = "caller-id-badge";
  if (!matched) {
    badgeCallerType.classList.add("unregistered");
    badgeCallerType.textContent = "Unregistered";
  } else if (matched.status === "BLOCKED") {
    badgeCallerType.classList.add("blocked");
    badgeCallerType.textContent = "Blocked";
  } else {
    badgeCallerType.textContent = "Authorized (Active)";
  }
}

if (selCallerNumber) {
  selCallerNumber.addEventListener("change", () => {
    currentCallerNumber = selCallerNumber.value;
    updateCallerBadge();
  });
}

if (btnSetCustomCaller && txtCustomCaller) {
  btnSetCustomCaller.addEventListener("click", () => {
    const custom = txtCustomCaller.value.trim();
    if (!custom) return;
    currentCallerNumber = custom;
    let opt = Array.from(selCallerNumber.options).find(o => o.value === custom);
    if (!opt) {
      opt = document.createElement("option");
      opt.value = custom;
      opt.textContent = `Custom: ${custom}`;
      selCallerNumber.appendChild(opt);
    }
    selCallerNumber.value = custom;
    updateCallerBadge();
    addTranscript("system", `Caller identity set to custom: ${custom}`);
  });
}

function renderRegisteredNumbersTable(numbers) {
  if (!tblRegisteredBody) return;

  let total = numbers.length;
  let active = 0;
  let blocked = 0;

  if (numbers.length === 0) {
    tblRegisteredBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">No authorized numbers found. Register a number using the form above.</td>
      </tr>
    `;
  } else {
    let rows = "";
    for (const r of numbers) {
      const isBlocked = (r.status === "BLOCKED");
      if (isBlocked) blocked++; else active++;

      const statusBadge = isBlocked 
        ? `<span class="badge-status-blocked">● BLOCKED</span>`
        : `<span class="badge-status-active">● ACTIVE</span>`;

      const actionBtn = isBlocked
        ? `<button class="btn-reg-action btn-unblock" onclick="toggleNumberStatus('${escapeHtml(r.phone_number)}', 'ACTIVE')">✔ Unblock</button>`
        : `<button class="btn-reg-action btn-block" onclick="toggleNumberStatus('${escapeHtml(r.phone_number)}', 'BLOCKED')">⛔ Block</button>`;

      rows += `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">${escapeHtml(r.phone_number)}</td>
          <td style="font-weight: 600;">${escapeHtml(r.display_name)}</td>
          <td><span style="font-size: 10px; color: #94a3b8; font-family: var(--font-mono);">${escapeHtml(r.role || "OPERATOR")}</span></td>
          <td>${statusBadge}</td>
          <td style="font-family: var(--font-mono); color: #64748b; font-size: 11px;">${escapeHtml(r.registered_at || "-")}</td>
          <td style="text-align: right; white-space: nowrap;">
            ${actionBtn}
            <button class="btn-reg-action btn-del" onclick="deleteRegisteredNumber('${escapeHtml(r.phone_number)}')" title="Delete from authorized registry">🗑</button>
          </td>
        </tr>
      `;
    }
    tblRegisteredBody.innerHTML = rows;
  }

  if (statTotalRegistered) statTotalRegistered.textContent = `Total: ${total}`;
  if (statActiveRegistered) statActiveRegistered.textContent = `Active: ${active}`;
  if (statBlockedRegistered) statBlockedRegistered.textContent = `Blocked: ${blocked}`;
}

async function toggleNumberStatus(phoneNumber, targetStatus) {
  try {
    const action = targetStatus === "BLOCKED" ? "block" : "unblock";
    const res = await fetch(`/api/registered-numbers/${encodeURIComponent(phoneNumber)}/${action}`, {
      method: "POST"
    });
    const result = await res.json();
    if (result.success) {
      addTranscript("system", `[ACCESS CONTROL] Number ${phoneNumber} is now ${targetStatus}.`);
      fetchRegisteredNumbers();
      fetchCallLogs();
    } else {
      alert(`Error updating number: ${result.error}`);
    }
  } catch (e) {
    console.error("Status toggle error:", e);
    alert("Network error updating number status.");
  }
}

async function deleteRegisteredNumber(phoneNumber) {
  if (!confirm(`Are you sure you want to remove ${phoneNumber} from the authorized caller list? They will no longer be able to call.`)) {
    return;
  }
  try {
    const res = await fetch(`/api/registered-numbers/${encodeURIComponent(phoneNumber)}`, {
      method: "DELETE"
    });
    const result = await res.json();
    if (result.success) {
      addTranscript("system", `[ACCESS CONTROL] Number ${phoneNumber} deleted from registry.`);
      fetchRegisteredNumbers();
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (e) {
    console.error("Delete error:", e);
  }
}

if (frmAddNumber) {
  frmAddNumber.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = txtRegPhone.value.trim();
    const name = txtRegName.value.trim();
    const role = selRegRole.value;

    if (!phone || !name) return;

    try {
      const res = await fetch("/api/registered-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone, display_name: name, role: role })
      });
      const data = await res.json();
      if (data.success) {
        addTranscript("system", `[ACCESS CONTROL] Registered new authorized number: ${phone} (${name})`);
        txtRegPhone.value = "";
        txtRegName.value = "";
        fetchRegisteredNumbers();
      } else {
        alert(data.error || "Failed to register number.");
      }
    } catch (err) {
      console.error("Add number error:", err);
      alert("Failed to submit registration request.");
    }
  });
}

window.toggleNumberStatus = toggleNumberStatus;
window.deleteRegisteredNumber = deleteRegisteredNumber;

// ──────────────────────────────────────────────
// Database Call Logs Polling & Rendering
// ──────────────────────────────────────────────

const dbCallLogsBody = document.getElementById("dbCallLogsBody");
const btnRefreshLogs = document.getElementById("btnRefreshLogs");
const btnClearDb = document.getElementById("btnClearDb");

async function fetchCallLogs() {
  if (!dbCallLogsBody) return;
  try {
    const res = await fetch("/api/call-logs");
    if (!res.ok) return;
    const data = await res.json();
    renderCallLogsTable(data.logs || []);
  } catch (err) {
    console.debug("Failed to fetch call logs:", err);
  }
}

function renderCallLogsTable(logs) {
  if (!dbCallLogsBody) return;
  if (!logs || logs.length === 0) {
    dbCallLogsBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">No toll-free calls recorded yet. Dial +1 573 859 5176 or click "Call Toll-Free" to record live calls.</td>
      </tr>
    `;
    return;
  }

  let rows = "";
  for (const log of logs) {
    const isIso = (log.tower_status === "ISOLATED");
    const channelClass = (log.call_type === "TWILIO_INBOUND") ? "twilio" : "simulator";
    const channelLabel = (log.call_type === "TWILIO_INBOUND") ? "Twilio Phone" : "Web Simulator";

    // Access Result Badge
    let accessBadge = '<span class="badge-access authorized">✔ AUTHORIZED</span>';
    if (log.status === "REJECTED_UNREGISTERED") {
      accessBadge = '<span class="badge-access unregistered">⛔ UNREGISTERED</span>';
    } else if (log.status === "REJECTED_BLOCKED") {
      accessBadge = '<span class="badge-access blocked">🚫 BLOCKED</span>';
    } else if (log.status && log.status.startsWith("REJECTED")) {
      accessBadge = `<span class="badge-access blocked">⛔ ${escapeHtml(log.status)}</span>`;
    }

    const towerText = log.tower_id ? log.tower_id : "-";
    const vStr = (Number(log.voltage_v) || 0).toFixed(2);
    const maStr = (Number(log.current_ma) || 0).toFixed(1);

    const callerNameTag = log.caller_name ? `<div style="font-size: 10px; color: #94a3b8;">${escapeHtml(log.caller_name)}</div>` : '';

    rows += `
      <tr>
        <td style="font-family: var(--font-mono); color: #94a3b8; font-size: 11px;">${log.timestamp}</td>
        <td>
          <div style="font-family: var(--font-mono); font-weight: 700; color: #facc15;">${escapeHtml(log.caller_number)}</div>
          ${callerNameTag}
        </td>
        <td>${accessBadge}</td>
        <td><span class="badge-channel ${channelClass}">${channelLabel}</span></td>
        <td style="font-weight: 700; text-transform: uppercase;">${log.language || "en"}</td>
        <td style="font-family: var(--font-mono); font-weight: 800; color: #38bdf8;">${towerText}</td>
        <td class="telemetry-cell">
          <span class="volt">${vStr} V</span>
          <span class="curr ${isIso ? 'isolated' : ''}">(${maStr} mA)</span>
        </td>
        <td><div class="spoken-cell" title="${log.spoken_response || ''}">${log.spoken_response || '-'}</div></td>
      </tr>
    `;
  }
  dbCallLogsBody.innerHTML = rows;
}

if (btnRefreshLogs) {
  btnRefreshLogs.addEventListener("click", () => {
    btnRefreshLogs.textContent = "⏳ Loading...";
    fetchCallLogs().finally(() => {
      setTimeout(() => { btnRefreshLogs.textContent = "🔄 Refresh Logs"; }, 400);
    });
  });
}

if (btnClearDb) {
  btnClearDb.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear all persistent call audit logs from SQLite database?")) {
      try {
        await fetch("/api/call-logs/clear", { method: "POST" });
        fetchCallLogs();
      } catch (e) {
        console.error("Clear error:", e);
      }
    }
  });
}

// Initial Load and Fast Sync Intervals
fetchTowersStatus();
fetchRegisteredNumbers();
fetchCallLogs();
setInterval(fetchTowersStatus, 1500);
setInterval(fetchRegisteredNumbers, 4000);
setInterval(fetchCallLogs, 3000);
