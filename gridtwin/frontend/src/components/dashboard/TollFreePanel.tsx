import React, { useState, useEffect, useRef } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  PhoneCall,
  PhoneOff,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Volume2,
  VolumeX,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  Activity,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface RegisteredCaller {
  phoneNumber: string;
  displayName: string;
  role: 'OPERATOR' | 'GRID_ADMIN' | 'FIELD_TECH' | 'DISPATCHER';
  status: 'ACTIVE' | 'BLOCKED';
  registeredAt: string;
}

interface CallLogEntry {
  id: string;
  timestamp: string;
  callerNumber: string;
  callerName: string;
  accessResult: 'AUTHORIZED' | 'UNREGISTERED' | 'BLOCKED';
  language: 'ta' | 'en' | 'hi';
  towerId?: string;
  towerStatus?: string;
  voltageV: number;
  currentMa: number;
  spokenResponse: string;
}

const DEFAULT_REGISTERED_CALLERS: RegisteredCaller[] = [
  {
    phoneNumber: '+15738595176',
    displayName: 'Official Hotline Gateway',
    role: 'GRID_ADMIN',
    status: 'ACTIVE',
    registeredAt: '2026-11-20 08:00:00'
  },
  {
    phoneNumber: '+919876543210',
    displayName: 'Madhu (Chief Grid Controller)',
    role: 'GRID_ADMIN',
    status: 'ACTIVE',
    registeredAt: '2026-11-21 09:30:00'
  },
  {
    phoneNumber: '+919444012345',
    displayName: 'Chennai Transmission Dispatcher',
    role: 'DISPATCHER',
    status: 'ACTIVE',
    registeredAt: '2026-11-22 11:15:00'
  },
  {
    phoneNumber: '+18005550199',
    displayName: 'Field Service Unit Alpha',
    role: 'FIELD_TECH',
    status: 'ACTIVE',
    registeredAt: '2026-11-23 14:00:00'
  }
];

const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

export const TollFreePanel: React.FC = () => {
  const {
    isolatedTowers = [],
    turnTowerOn,
    turnTowerOff,
    isReverseFeedActive,
    setActiveTab
  } = useGridStore();

  // Call Lifecycle State
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callStage, setCallStage] = useState<'IDLE' | 'LANGUAGE_SELECTION' | 'TOWER_SELECTION' | 'MENU_OPTIONS' | 'CALL_ENDED'>('IDLE');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ta' | 'hi'>('en');
  const [displayText, setDisplayText] = useState<string>('Press the green "Call Toll-Free" button to test the IVR system.');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [allowTts, setAllowTts] = useState<boolean>(true);

  // Caller ID & Access Control State
  const [registeredCallers, setRegisteredCallers] = useState<RegisteredCaller[]>(() => {
    try {
      const saved = localStorage.getItem('gridtwin_registered_callers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_REGISTERED_CALLERS;
  });

  const [selectedCallerNumber, setSelectedCallerNumber] = useState<string>('+15738595176');
  const [customCallerInput, setCustomCallerInput] = useState<string>('');

  // Add Number Form State
  const [newPhone, setNewPhone] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<'OPERATOR' | 'GRID_ADMIN' | 'FIELD_TECH' | 'DISPATCHER'>('OPERATOR');

  // Logs & Transcripts
  const [transcript, setTranscript] = useState<Array<{ type: 'system' | 'caller' | 'ivr' | 'alert'; time: string; text: string }>>([
    { type: 'system', time: new Date().toLocaleTimeString(), text: 'System initialized. Ready for toll-free hotline calls.' }
  ]);

  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('gridtwin_call_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const audioContextRef = useRef<AudioContext | null>(null);

  // Save registered callers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gridtwin_registered_callers', JSON.stringify(registeredCallers));
    } catch {}
  }, [registeredCallers]);

  // Save call logs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gridtwin_call_logs', JSON.stringify(callLogs));
    } catch {}
  }, [callLogs]);

  // Call timer interval
  useEffect(() => {
    let interval: any = null;
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  const addTranscript = (type: 'system' | 'caller' | 'ivr' | 'alert', text: string) => {
    setTranscript(prev => [...prev.slice(-30), {
      type,
      time: new Date().toLocaleTimeString(),
      text
    }]);
  };

  // DTMF Tone generator
  const playDtmfTone = (key: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const freqs = DTMF_FREQS[key];
      if (!freqs) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.debug('DTMF audio error:', e);
    }
  };

  // TTS Speech Synthesis
  const speakText = (text: string, langCode: 'en' | 'ta' | 'hi' = 'en', onEnd?: () => void) => {
    if (!allowTts || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\[OPTIONS\].*$/s, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const localeMap = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };
      utterance.lang = localeMap[langCode] || 'en-IN';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const langPrefix = utterance.lang.split('-')[0];
      const matched = voices.find(v => v.lang.startsWith(langPrefix) || v.lang === utterance.lang);
      if (matched) utterance.voice = matched;

      setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    }
  };

  // Check caller authorization
  const getCallerAuthStatus = (phone: string) => {
    const matched = registeredCallers.find(c => c.phoneNumber.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, ''));
    if (!matched) return { authorized: false, status: 'UNREGISTERED' as const, caller: null };
    if (matched.status === 'BLOCKED') return { authorized: false, status: 'BLOCKED' as const, caller: matched };
    return { authorized: true, status: 'ACTIVE' as const, caller: matched };
  };

  const currentAuth = getCallerAuthStatus(selectedCallerNumber);

  // Start Call Handler
  const handleStartCall = () => {
    addTranscript('caller', `📞 Calling +1 573 859 5176 from [${selectedCallerNumber}]...`);

    const auth = getCallerAuthStatus(selectedCallerNumber);

    // Check Authorization: UNREGISTERED or BLOCKED
    if (!auth.authorized) {
      setCallActive(false);
      if (auth.status === 'UNREGISTERED') {
        const deniedMsg = 'Access Denied: Your phone number is not registered with GridTwin SCADA Hotline. Access is restricted to authorized personnel.';
        setDisplayText(`❌ ACCESS DENIED (UNREGISTERED)\n\n${deniedMsg}\n\nPlease register your phone number below.`);
        addTranscript('alert', `❌ CALL REJECTED: ${selectedCallerNumber} is UNREGISTERED`);
        speakText(deniedMsg, 'en');

        logCallEvent(selectedCallerNumber, 'Unregistered Caller', 'UNREGISTERED', 'en', undefined, undefined, 0, 0, deniedMsg);
      } else {
        const blockedMsg = 'Access Denied: Your phone number is currently BLOCKED by Grid Administration. Calls cannot be connected.';
        setDisplayText(`🚫 ACCESS DENIED (BLOCKED)\n\n${blockedMsg}`);
        addTranscript('alert', `🚫 CALL REJECTED: ${auth.caller?.displayName || selectedCallerNumber} is BLOCKED`);
        speakText(blockedMsg, 'en');

        logCallEvent(selectedCallerNumber, auth.caller?.displayName || 'Blocked Caller', 'BLOCKED', 'en', undefined, undefined, 0, 0, blockedMsg);
      }
      return;
    }

    // Call Authorized
    setCallActive(true);
    setCallStage('LANGUAGE_SELECTION');
    const welcome = `✔ CALL CONNECTED — ${auth.caller?.displayName}\n\nWelcome to GRIDTWIN 24/7 Hotline.\nPress 1 for Tamil (தமிழ்)\nPress 2 for English\nPress 3 for Hindi (हिंदी)`;
    setDisplayText(welcome);

    addTranscript('ivr', `Connected to GRIDTWIN 24/7 Hotline. Caller: ${auth.caller?.displayName}`);
    addTranscript('ivr', 'Prompt: Press 1 for Tamil, 2 for English, 3 for Hindi.');

    speakText('Welcome to GridTwin Toll-Free Hotline. Press 1 for Tamil, 2 for English, 3 for Hindi.', 'en');
  };

  const handleHangup = () => {
    setCallActive(false);
    setCallStage('IDLE');
    setDisplayText('Call disconnected. Press "Call Toll-Free" to begin a new test.');
    setIsSpeaking(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    addTranscript('system', '📴 Call disconnected.');
  };

  // DTMF Keypress Handler
  const handleKeyPress = (key: string) => {
    playDtmfTone(key);

    if (!callActive) {
      addTranscript('system', `Key [${key}] pressed while phone is on-hook.`);
      return;
    }

    addTranscript('caller', `👉 Caller pressed: [${key}]`);

    // 1. Language Selection Stage
    if (callStage === 'LANGUAGE_SELECTION') {
      let lang: 'en' | 'ta' | 'hi' = 'en';
      let promptText = '';

      if (key === '1') {
        lang = 'ta';
        setSelectedLanguage('ta');
        promptText = 'மின் கோபுர நிலையை அறிய 1 முதல் 5 வரை உள்ள எண்ணை அழுத்தவும்.';
      } else if (key === '2') {
        lang = 'en';
        setSelectedLanguage('en');
        promptText = 'Please enter Tower ID from 1 to 5 to check isolation status.';
      } else if (key === '3') {
        lang = 'hi';
        setSelectedLanguage('hi');
        promptText = 'टावर की स्थिति जानने के लिए 1 से 5 तक कोई संख्या दबाएं।';
      } else {
        const invalid = 'Invalid language digit. Press 1 for Tamil, 2 for English, 3 for Hindi.';
        setDisplayText(invalid);
        speakText(invalid, 'en');
        return;
      }

      setCallStage('TOWER_SELECTION');
      setDisplayText(`[LANGUAGE SELECTED: ${lang.toUpperCase()}]\n\n${promptText}`);
      addTranscript('ivr', promptText);
      speakText(promptText, lang);
    }

    // 2. Tower Selection Stage (1 to 5)
    else if (callStage === 'TOWER_SELECTION') {
      if (!['1', '2', '3', '4', '5'].includes(key)) {
        const invalid = selectedLanguage === 'ta'
          ? 'தவறான கோபுர எண். தயவுசெய்து 1 முதல் 5 வரை உள்ள எண்ணை அழுத்தவும்.'
          : selectedLanguage === 'hi'
          ? 'अमान्य टावर संख्या। कृपया 1 से 5 तक दबाएं।'
          : 'Invalid tower number. Please enter a digit from 1 to 5.';
        setDisplayText(invalid);
        speakText(invalid, selectedLanguage);
        return;
      }

      const towerId = `T${key}` as 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
      const isIso = isolatedTowers.includes(towerId);
      const curMa = isIso ? 0.0 : 145.2;
      const voltV = isIso ? 0.0 : 5.0;

      let statusMsg = '';
      if (selectedLanguage === 'ta') {
        statusMsg = isIso
          ? `எச்சரிக்கை! மின் கோபுரம் ${key} தற்போது தனிமைப்படுத்தப்பட்டுள்ளது. மின் ஓட்டம் தடைபட்டுள்ளது. மின்னோட்டம் 0 மில்லி ஆம்பியர்.`
          : `மின் கோபுரம் ${key} சீராக இயங்குகிறது. மின்சாரம் சீராக பாய்கிறது. மின்னோட்டம் ${curMa.toFixed(1)} மில்லி ஆம்பியர், மின் அழுத்தம் ${voltV.toFixed(1)} வோல்ட்.`;
      } else if (selectedLanguage === 'hi') {
        statusMsg = isIso
          ? `चेतावनी! टावर ${key} अलग कर दिया गया है। विद्युत आपूर्ति बंद है। करंट शून्य मिलीएम्पीयर है।`
          : `टावर ${key} सामान्य रूप से सक्रिय है। विद्युत प्रवाह चालू है। करंट ${curMa.toFixed(1)} मिलीएम्पीयर, वोल्टेज ${voltV.toFixed(1)} वोल्ट है।`;
      } else {
        statusMsg = isIso
          ? `Alert! Tower ${key} is currently ISOLATED. Power supply is cut off. Line current is 0.0 milliamps.`
          : `Tower ${key} is active and transmitting power normally. Bus voltage is ${voltV.toFixed(1)} Volts. Line current is ${curMa.toFixed(1)} milliamps.`;
      }

      if (isReverseFeedActive && !isIso) {
        statusMsg += ' [ALERT: Reverse Feed Current Detected]';
      }

      const menuMsg = selectedLanguage === 'ta'
        ? '\n\n[விருப்பங்கள்]\nமற்றொரு கோபுரத்தை அறிய 1 ஐ அழுத்தவும். மொழியை மாற்ற 9 ஐ அழுத்தவும்.'
        : selectedLanguage === 'hi'
        ? '\n\n[विकल्प]\nदूसरे टावर के लिए 1 दबाएं। भाषा बदलने के लिए 9 दबाएं।'
        : '\n\n[OPTIONS]\nPress 1 to check another tower. Press 9 to change language. Press any other key to hang up.';

      setCallStage('MENU_OPTIONS');
      setDisplayText(`${statusMsg}${menuMsg}`);
      addTranscript('ivr', statusMsg);
      speakText(statusMsg, selectedLanguage);

      // Log Call to Audit Database
      const caller = getCallerAuthStatus(selectedCallerNumber).caller;
      logCallEvent(
        selectedCallerNumber,
        caller?.displayName || 'Authorized Caller',
        'AUTHORIZED',
        selectedLanguage,
        towerId,
        isIso ? 'ISOLATED' : 'ACTIVE',
        voltV,
        curMa,
        statusMsg
      );
    }

    // 3. Menu Options Stage
    else if (callStage === 'MENU_OPTIONS') {
      if (key === '1') {
        // Query another tower in same language
        setCallStage('TOWER_SELECTION');
        const p = selectedLanguage === 'ta'
          ? 'மின் கோபுர நிலையை அறிய 1 முதல் 5 வரை உள்ள எண்ணை அழுத்தவும்.'
          : selectedLanguage === 'hi'
          ? 'टावर संख्या 1 से 5 दर्ज करें।'
          : 'Please enter Tower ID from 1 to 5 to check isolation status.';
        setDisplayText(p);
        speakText(p, selectedLanguage);
      } else if (key === '9') {
        // Change language
        setCallStage('LANGUAGE_SELECTION');
        const p = 'Press 1 for Tamil, 2 for English, 3 for Hindi.';
        setDisplayText(p);
        speakText(p, 'en');
      } else {
        // Hang up
        const goodbye = selectedLanguage === 'ta'
          ? 'கிரிட்ட்வின் அழைத்ததற்கு நன்றி. வணக்கம்.'
          : selectedLanguage === 'hi'
          ? 'ग्रिडट्विन हेल्पलाइन पर कॉल करने के लिए धन्यवाद। अलविदा।'
          : 'Thank you for calling GRIDTWIN Hotline. Goodbye.';
        setDisplayText(goodbye);
        speakText(goodbye, selectedLanguage, () => {
          setTimeout(handleHangup, 1000);
        });
      }
    }
  };

  // Helper to record call logs
  const logCallEvent = (
    phone: string,
    name: string,
    access: 'AUTHORIZED' | 'UNREGISTERED' | 'BLOCKED',
    lang: 'ta' | 'en' | 'hi',
    towerId?: string,
    towerStatus?: string,
    voltageV: number = 0,
    currentMa: number = 0,
    spoken: string = ''
  ) => {
    const entry: CallLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString(),
      callerNumber: phone,
      callerName: name,
      accessResult: access,
      language: lang,
      towerId,
      towerStatus,
      voltageV,
      currentMa,
      spokenResponse: spoken
    };
    setCallLogs(prev => [entry, ...prev.slice(0, 99)]);
  };

  // Register New Number
  const handleAddCaller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !newName.trim()) return;

    const formattedPhone = newPhone.trim().startsWith('+') ? newPhone.trim() : `+${newPhone.trim()}`;
    const newEntry: RegisteredCaller = {
      phoneNumber: formattedPhone,
      displayName: newName.trim(),
      role: newRole,
      status: 'ACTIVE',
      registeredAt: new Date().toLocaleString()
    };

    setRegisteredCallers(prev => [newEntry, ...prev]);
    setSelectedCallerNumber(formattedPhone);
    setNewPhone('');
    setNewName('');
    addTranscript('system', `[ACCESS CONTROL] Registered new authorized caller: ${formattedPhone} (${newName})`);
  };

  // Toggle Block / Unblock
  const toggleBlockStatus = (phone: string) => {
    setRegisteredCallers(prev => prev.map(c => {
      if (c.phoneNumber === phone) {
        const nextStatus = c.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        addTranscript('system', `[ACCESS CONTROL] Caller ${phone} is now ${nextStatus}.`);
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  // Delete Number
  const handleDeleteCaller = (phone: string) => {
    if (!confirm(`Are you sure you want to remove ${phone} from authorized callers?`)) return;
    setRegisteredCallers(prev => prev.filter(c => c.phoneNumber !== phone));
    addTranscript('system', `[ACCESS CONTROL] Removed ${phone} from authorized registry.`);
  };

  // Quick Dial Tower
  const handleQuickDial = (num: string) => {
    if (!callActive) {
      handleStartCall();
      setTimeout(() => handleKeyPress('2'), 600); // Select English
      setTimeout(() => handleKeyPress(num), 1400); // Select Tower
    } else {
      handleKeyPress(num);
    }
  };

  // Toggle Tower from UI
  const handleTowerToggle = (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    if (isolatedTowers.includes(towerId)) {
      turnTowerOn(towerId);
      addTranscript('system', `[2-WAY SYNC] Tower ${towerId} RESTORED from Toll-Free UI.`);
    } else {
      turnTowerOff(towerId);
      addTranscript('system', `[2-WAY SYNC] Tower ${towerId} ISOLATED from Toll-Free UI.`);
    }
  };

  // Stats
  const totalReg = registeredCallers.length;
  const activeReg = registeredCallers.filter(c => c.status === 'ACTIVE').length;
  const blockedReg = registeredCallers.filter(c => c.status === 'BLOCKED').length;

  const timerMin = String(Math.floor(callDuration / 60)).padStart(2, '0');
  const timerSec = String(callDuration % 60).padStart(2, '0');

  return (
    <div className="w-full flex flex-col gap-5 text-slate-100">
      {/* Top Banner Alert Bar */}
      <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-md">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">GRIDTWIN 24/7 Toll-Free Voice Hotline</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold uppercase">
                Zero Cloud Limits
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Multi-Lingual SCADA IVR Telemetry &amp; Access Control Gating (Whitelist &amp; Blocklist)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('3d-twin')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-cyan-300 font-bold transition-all"
          >
            <span>🌐 View 3D Lab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Cockpit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (4 Cols): Virtual Phone Device & Dialpad */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#0b132b]/95 border border-slate-800 rounded-3xl p-5 flex flex-col gap-3.5 shadow-2xl">
            {/* Phone Brand Top */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span className="font-extrabold text-sm tracking-wider text-white">GRIDTWIN PHONE</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                SCADA-IVR v2.4
              </span>
            </div>

            {/* Hotline Display Card */}
            <div className="bg-gradient-to-br from-slate-900 to-[#070e1e] border border-cyan-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-black text-white tracking-wide font-mono">+1 573 859 5176</div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={`w-2 h-2 rounded-full ${callActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className={callActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {callActive ? 'Connected' : 'On-Hook'}
                  </span>
                  {callActive && <span className="font-mono text-slate-400 ml-1">({timerMin}:{timerSec})</span>}
                </div>
              </div>
            </div>

            {/* OLED Virtual Phone Screen */}
            <div className="bg-[#040813] border border-cyan-500/30 rounded-2xl p-3.5 min-h-[110px] flex flex-col justify-between">
              <div className="text-xs font-mono font-medium text-emerald-300 leading-relaxed whitespace-pre-line select-text">
                {displayText}
              </div>
              {isSpeaking && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800 text-[11px] text-cyan-400 font-bold">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>Speaking ({selectedLanguage.toUpperCase()})...</span>
                </div>
              )}
            </div>

            {/* Caller Identity Selector (Access Control Gateway) */}
            <div className="bg-[#070e1e] border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Calling From (Caller ID):</span>
                <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                  currentAuth.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : currentAuth.status === 'BLOCKED'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {currentAuth.status === 'ACTIVE' ? '✔ Authorized' : currentAuth.status === 'BLOCKED' ? '🚫 Blocked' : '⛔ Unregistered'}
                </span>
              </div>

              <select
                value={selectedCallerNumber}
                onChange={(e) => setSelectedCallerNumber(e.target.value)}
                className="w-full bg-[#050a16] border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs font-semibold text-white outline-none focus:border-cyan-400"
              >
                {registeredCallers.map((c) => (
                  <option key={c.phoneNumber} value={c.phoneNumber}>
                    {c.status === 'BLOCKED' ? '🚫 ' : '📱 '}{c.phoneNumber} ({c.displayName}) [{c.status}]
                  </option>
                ))}
                <option value="+919999900000">⛔ +91 99999 00000 (Unregistered Stranger - Test Rejection)</option>
                <option value="+18000009999">⛔ +1 800 000 9999 (Unregistered International - Test Rejection)</option>
              </select>

              {/* Custom Caller Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or test custom phone number..."
                  value={customCallerInput}
                  onChange={(e) => setCustomCallerInput(e.target.value)}
                  className="flex-1 bg-[#050a16] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customCallerInput.trim()) {
                      setSelectedCallerNumber(customCallerInput.trim());
                      setCustomCallerInput('');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-xl transition-all"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Dialpad 3x4 Grid */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => {
                const subLabels: Record<string, string> = {
                  '1': 'TAMIL', '2': 'ENG', '3': 'HINDI',
                  '4': 'GHI', '5': 'JKL', '6': 'MNO',
                  '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
                  '*': 'RESET', '0': '+', '#': 'MENU'
                };
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress(key)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:scale-95 border border-slate-800/80 transition-all shadow-md group"
                  >
                    <span className="text-base font-black text-white group-hover:text-cyan-400 leading-none">{key}</span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-0.5">{subLabels[key]}</span>
                  </button>
                );
              })}
            </div>

            {/* Call Controls: Green Call & Red Hangup */}
            <div className="flex flex-col gap-2 pt-1">
              {!callActive ? (
                <button
                  type="button"
                  onClick={handleStartCall}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98]"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call Toll-Free (+1 573 859 5176)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleHangup}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-[0.98]"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              )}
            </div>

            {/* Audio Voice Speech Toggle */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={allowTts}
                  onChange={(e) => setAllowTts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Allow Voice Speech (TTS)</span>
              </label>
              {allowTts ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (8 Cols): Telemetry, Access Control & Call Audit Log */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* 1. Live Transmission Towers Status (5 Towers synced with 3D Twin) */}
          <div className="bg-[#0b132b]/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-sm font-black text-white tracking-wide">Live Towers Telemetry &amp; Isolation Sync</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Direct 2-Way Live Sync with 3D Digital Twin</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Live 3D Twin Store
              </span>
            </div>

            {/* 5 Towers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {(['T1', 'T2', 'T3', 'T4', 'T5'] as const).map((towerId, idx) => {
                const towerNum = String(idx + 1);
                const isIso = isolatedTowers.includes(towerId);
                const curVal = isIso ? '0.0 mA' : '145.2 mA';
                const voltVal = isIso ? '0.0 V' : '5.0 V';

                return (
                  <div
                    key={towerId}
                    className={`rounded-2xl p-3 flex flex-col justify-between border transition-all ${
                      isIso
                        ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/40'
                        : 'bg-[#080f22] border-cyan-500/20 hover:border-cyan-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-black text-xs text-white">{towerId}</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          isIso ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {isIso ? 'ISOLATED' : 'ACTIVE'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 text-[11px] font-mono py-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Volt:</span>
                          <span className="text-white font-bold">{voltVal}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Curr:</span>
                          <span className={isIso ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold'}>{curVal}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleQuickDial(towerNum)}
                        className="w-full py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Dial T{towerNum}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTowerToggle(towerId)}
                        className={`w-full py-1 rounded-lg font-bold text-[10px] transition-all ${
                          isIso
                            ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isIso ? '⚡ Restore' : '⚙ Isolate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Real-Time Call Transcript */}
          <div className="bg-[#0b132b]/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white tracking-wide">Real-Time Call Transcript &amp; DTMF Log</h3>
              </div>
              <button
                type="button"
                onClick={() => setTranscript([{ type: 'system', time: new Date().toLocaleTimeString(), text: 'Log cleared.' }])}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800/60 transition-colors"
              >
                Clear Log
              </button>
            </div>

            <div className="bg-[#050b18] border border-slate-800/80 rounded-2xl p-3 max-h-[140px] overflow-y-auto flex flex-col gap-1 font-mono text-[11px]">
              {transcript.map((entry, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[{entry.time}]</span>
                  <span className={
                    entry.type === 'caller'
                      ? 'text-cyan-400'
                      : entry.type === 'ivr'
                      ? 'text-emerald-300'
                      : entry.type === 'alert'
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-400'
                  }>
                    {entry.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Authorized Callers & Access Control (Whitelist & Blocklist) */}
          <div className="bg-[#0b132b]/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white tracking-wide">Authorized Callers &amp; Access Control (Whitelist &amp; Blocklist)</h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">Total: {totalReg}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Active: {activeReg}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">Blocked: {blockedReg}</span>
              </div>
            </div>

            {/* Quick Add Number Form */}
            <form onSubmit={handleAddCaller} className="bg-[#070e1e] border border-slate-800 rounded-2xl p-3.5 flex flex-wrap gap-2.5 items-end">
              <div className="flex-1 min-w-[150px] flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Phone Number (E.164):</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="bg-[#050a16] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex-1 min-w-[150px] flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Personnel Name / Unit:</label>
                <input
                  type="text"
                  placeholder="e.g. Substation Lead Officer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="bg-[#050a16] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="w-[130px] flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Role:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="bg-[#050a16] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="GRID_ADMIN">GRID ADMIN</option>
                  <option value="FIELD_TECH">FIELD TECH</option>
                  <option value="DISPATCHER">DISPATCHER</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </form>

            {/* Registry Table */}
            <div className="overflow-x-auto border border-slate-800/80 rounded-2xl max-h-[190px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#060c1c] text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Phone Number</th>
                    <th className="p-2.5">Authorized Personnel</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Access Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#070e20]">
                  {registeredCallers.map((caller) => {
                    const isBlocked = caller.status === 'BLOCKED';
                    return (
                      <tr key={caller.phoneNumber} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-cyan-300">{caller.phoneNumber}</td>
                        <td className="p-2.5 font-medium text-white">{caller.displayName}</td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-400">{caller.role}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isBlocked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}>
                            {isBlocked ? '● BLOCKED' : '● ACTIVE'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleBlockStatus(caller.phoneNumber)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isBlocked
                                ? 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-600/30 hover:bg-rose-600 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {isBlocked ? '✔ Unblock' : '⛔ Block'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCaller(caller.phoneNumber)}
                            title="Delete number"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Database Audit Call Logs */}
          <div className="bg-[#0b132b]/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white tracking-wide">Call Audit Log: Toll-Free Access &amp; Spoken Responses</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCallLogs([])}
                  className="text-[11px] text-slate-400 hover:text-rose-400 px-2.5 py-1 rounded-lg bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear DB</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800/80 rounded-2xl max-h-[220px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#060c1c] text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Caller Identity</th>
                    <th className="p-2.5">Access Result</th>
                    <th className="p-2.5">Lang</th>
                    <th className="p-2.5">Tower</th>
                    <th className="p-2.5">Telemetry</th>
                    <th className="p-2.5">Spoken Audio Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#070e20]">
                  {callLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                        No toll-free calls recorded yet. Use the dialpad on the left to make your first call!
                      </td>
                    </tr>
                  ) : (
                    callLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-2.5">
                          <div className="font-mono font-bold text-amber-300">{log.callerNumber}</div>
                          <div className="text-[10px] text-slate-400">{log.callerName}</div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {log.accessResult === 'AUTHORIZED' ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              ✔ AUTHORIZED
                            </span>
                          ) : log.accessResult === 'BLOCKED' ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              🚫 BLOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              ⛔ UNREGISTERED
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold uppercase">{log.language}</td>
                        <td className="p-2.5 font-mono font-bold text-cyan-300">{log.towerId || '-'}</td>
                        <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">
                          <span className="text-white font-bold">{log.voltageV.toFixed(1)}V</span>{' '}
                          <span className={log.towerStatus === 'ISOLATED' ? 'text-rose-400' : 'text-cyan-400'}>
                            ({log.currentMa.toFixed(1)}mA)
                          </span>
                        </td>
                        <td className="p-2.5 max-w-[240px] truncate text-slate-300 text-[11px]" title={log.spokenResponse}>
                          {log.spokenResponse}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
