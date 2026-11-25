import React, { useState, useEffect, useRef } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  PhoneCall,
  PhoneOff,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Zap,
  Activity,
  ExternalLink,
  Radio,
  ChevronUp,
  ChevronDown
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

// ──────────────────────────────────────────────
// SVG Transmission Tower Graphic (Lattice Pylon)
// Exact match to reference design:
// Glowing Cyan/Green when Active, Glowing Red when Isolated
// ──────────────────────────────────────────────
const TowerGraphicSvg: React.FC<{ isIsolated: boolean }> = ({ isIsolated }) => {
  const strokeColor = isIsolated ? '#ef4444' : '#00f0ff';
  const wireColor = isIsolated ? '#f87171' : '#06b6d4';
  const centerFill = isIsolated ? '#ef4444' : '#00f0ff';

  return (
    <svg className="w-full h-24 my-1 select-none" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={isIsolated ? "glow-iso" : "glow-act"} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Horizontal Power Lines passing through crossarms */}
      {isIsolated ? (
        <>
          <path d="M0 38 L55 38" stroke={wireColor} strokeWidth="1.8" strokeDasharray="4,4" opacity="0.85" />
          <path d="M105 38 L160 38" stroke={wireColor} strokeWidth="1.8" strokeDasharray="4,4" opacity="0.85" />
          <path d="M0 55 L45 55" stroke={wireColor} strokeWidth="1.8" strokeDasharray="4,4" opacity="0.85" />
          <path d="M115 55 L160 55" stroke={wireColor} strokeWidth="1.8" strokeDasharray="4,4" opacity="0.85" />
          <path d="M0 72 L38 72" stroke={wireColor} strokeWidth="1.8" strokeDasharray="4,4" opacity="0.85" />
          <path d="M122 72 L160 72" stroke={wireColor} strokeWidth="1.8" strokeDasharray="4,4" opacity="0.85" />
        </>
      ) : (
        <>
          <line x1="0" y1="38" x2="160" y2="38" stroke={wireColor} strokeWidth="1.8" opacity="0.9" />
          <line x1="0" y1="55" x2="160" y2="55" stroke={wireColor} strokeWidth="1.8" opacity="0.9" />
          <line x1="0" y1="72" x2="160" y2="72" stroke={wireColor} strokeWidth="1.8" opacity="0.9" />
        </>
      )}

      {/* Main Lattice Tower Structure */}
      <g stroke={strokeColor} strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${isIsolated ? "glow-iso" : "glow-act"})`}>
        {/* Legs */}
        <line x1="58" y1="112" x2="74" y2="18" />
        <line x1="102" y1="112" x2="86" y2="18" />
        {/* Peak apex */}
        <line x1="74" y1="18" x2="80" y2="8" />
        <line x1="86" y1="18" x2="80" y2="8" />
        
        {/* 3 Crossarms */}
        <line x1="55" y1="38" x2="105" y2="38" />
        <line x1="45" y1="55" x2="115" y2="55" />
        <line x1="38" y1="72" x2="122" y2="72" />

        {/* Triangular Lattice Bracing */}
        <line x1="62" y1="100" x2="98" y2="100" />
        <line x1="62" y1="100" x2="95" y2="84" />
        <line x1="98" y1="100" x2="65" y2="84" />
        <line x1="65" y1="84" x2="95" y2="84" />
        <line x1="68" y1="72" x2="92" y2="72" />
        <line x1="68" y1="72" x2="89" y2="55" />
        <line x1="92" y1="72" x2="71" y2="55" />
        <line x1="71" y1="55" x2="89" y2="55" />
        <line x1="73" y1="38" x2="87" y2="38" />
        <line x1="80" y1="8" x2="80" y2="38" strokeWidth="1.4" opacity="0.7" />
      </g>

      {/* Center Beacon / Isolation Badge */}
      {isIsolated ? (
        <g>
          <circle cx="80" cy="55" r="9" fill="#991b1b" stroke="#f87171" strokeWidth="1.8" />
          <text x="80" y="58.5" textAnchor="middle" fill="#fee2e2" fontSize="9" fontWeight="900" fontFamily="sans-serif">✕</text>
        </g>
      ) : (
        <g>
          <circle cx="80" cy="55" r="6" fill={centerFill} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="80" cy="55" r="11" fill="none" stroke={centerFill} strokeWidth="1" strokeDasharray="3,3" opacity="0.8" />
        </g>
      )}
    </svg>
  );
};

export const TollFreePanel: React.FC = () => {
  const {
    isolatedTowers = [],
    turnTowerOn,
    turnTowerOff,
    isReverseFeedActive,
    setActiveTab,
    isUsbConnected,
    connectUsbSerial,
    toggleHardwareLogic
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
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const callersTableContainerRef = useRef<HTMLDivElement | null>(null);
  const auditTableContainerRef = useRef<HTMLDivElement | null>(null);

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
    setTranscript(prev => {
      const next = [...prev.slice(-50), {
        type,
        time: new Date().toLocaleTimeString(),
        text
      }];
      return next;
    });
    // Auto-scroll to bottom on new message
    setTimeout(() => {
      if (transcriptContainerRef.current) {
        transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  // Scroll helpers
  const scrollTranscript = (direction: 'up' | 'down') => {
    if (!transcriptContainerRef.current) return;
    const delta = direction === 'up' ? -120 : 120;
    transcriptContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
  };

  const scrollAuditLog = (direction: 'up' | 'down') => {
    if (!auditTableContainerRef.current) return;
    const delta = direction === 'up' ? -150 : 150;
    auditTableContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
  };

  const scrollCallersTable = (direction: 'up' | 'down') => {
    if (!callersTableContainerRef.current) return;
    const delta = direction === 'up' ? -120 : 120;
    callersTableContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
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
        setCallStage('TOWER_SELECTION');
        const p = selectedLanguage === 'ta'
          ? 'மின் கோபுர நிலையை அறிய 1 முதல் 5 வரை உள்ள எண்ணை அழுத்தவும்.'
          : selectedLanguage === 'hi'
          ? 'टावर संख्या 1 से 5 दर्ज करें।'
          : 'Please enter Tower ID from 1 to 5 to check isolation status.';
        setDisplayText(p);
        speakText(p, selectedLanguage);
      } else if (key === '9') {
        setCallStage('LANGUAGE_SELECTION');
        const p = 'Press 1 for Tamil, 2 for English, 3 for Hindi.';
        setDisplayText(p);
        speakText(p, 'en');
      } else {
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
  const handleTowerToggle = async (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    if (!isUsbConnected && typeof window !== 'undefined' && 'serial' in navigator) {
      addTranscript('system', `[HARDWARE] Attempting direct USB Serial connection to ESP32...`);
      const ok = await connectUsbSerial();
      if (!ok) {
        addTranscript('system', `[NOTE] ESP32 not connected. Please click "CONNECT ESP32 (USB)" at the top to sync physical relays.`);
      }
    }

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

  const isolatedCount = isolatedTowers.length;

  return (
    <div className="w-full flex flex-col gap-6 text-slate-100 max-w-7xl mx-auto pb-8">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* TOP HEADER: EXACT MATCH TO MOCKUP WITH SUNSET TOWER SILHOUETTES */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#180e05]/95 via-[#071329]/95 to-[#061126] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_24px_rgba(6,182,212,0.18)]">
        {/* Sunset Silhouette Art */}
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-amber-600/20 via-orange-500/10 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-blue-600/20 via-cyan-500/10 to-transparent pointer-events-none" />

        {/* Transmission Tower Silhouettes Left & Right */}
        <svg className="absolute left-3 bottom-0 h-full w-28 opacity-30 pointer-events-none" viewBox="0 0 100 120">
          <line x1="35" y1="120" x2="48" y2="20" stroke="#f59e0b" strokeWidth="2.5" />
          <line x1="65" y1="120" x2="52" y2="20" stroke="#f59e0b" strokeWidth="2.5" />
          <line x1="20" y1="40" x2="80" y2="40" stroke="#f59e0b" strokeWidth="2.5" />
          <line x1="15" y1="60" x2="85" y2="60" stroke="#f59e0b" strokeWidth="2.5" />
          <line x1="10" y1="80" x2="90" y2="80" stroke="#f59e0b" strokeWidth="2.5" />
          <line x1="38" y1="100" x2="62" y2="100" stroke="#f59e0b" strokeWidth="2" />
          <line x1="48" y1="20" x2="50" y2="10" stroke="#f59e0b" strokeWidth="2" />
          <line x1="52" y1="20" x2="50" y2="10" stroke="#f59e0b" strokeWidth="2" />
        </svg>

        <svg className="absolute right-3 bottom-0 h-full w-28 opacity-30 pointer-events-none" viewBox="0 0 100 120">
          <line x1="35" y1="120" x2="48" y2="20" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="65" y1="120" x2="52" y2="20" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="20" y1="40" x2="80" y2="40" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="15" y1="60" x2="85" y2="60" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="10" y1="80" x2="90" y2="80" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="38" y1="100" x2="62" y2="100" stroke="#38bdf8" strokeWidth="2" />
          <line x1="48" y1="20" x2="50" y2="10" stroke="#38bdf8" strokeWidth="2" />
          <line x1="52" y1="20" x2="50" y2="10" stroke="#38bdf8" strokeWidth="2" />
        </svg>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1 pl-4 sm:pl-16">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-md">
                GRIDTWIN 24/7 Toll-Free Voice Hotline
              </h1>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ZERO CLOUD LIMITS</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Multi-Lingual SCADA IVR Telemetry &amp; Authorized Caller Access Control (Whitelist &amp; Blocklist)
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs pr-2 sm:pr-8">
            <button
              onClick={() => setActiveTab('3d-twin')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/60 border border-cyan-400/50 text-cyan-200 font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>🌐 Open 3D Lab</span>
              <ExternalLink className="w-4 h-4 text-cyan-300" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MAIN 2-COLUMN COCKPIT LAYOUT                                */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (4 Cols): Virtual Phone Device & Dialpad */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-gradient-to-b from-[#091326] via-[#070e1c] to-[#040812] border border-cyan-500/35 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
            {/* Phone Top Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide text-white">GRIDTWIN PHONE</h3>
                  <p className="text-[10px] text-slate-400 font-mono font-medium">SCADA-IVR TELEMETRY</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-emerald-500/50 text-emerald-400 font-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                v2.4 Online
              </span>
            </div>

            {/* Hotline Calling Gateway Display */}
            <div className="bg-[#050b18] border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1 shadow-inner">
              <div className="text-xl font-black text-white font-mono tracking-wider">
                +1 573 859 5176
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className={`w-2.5 h-2.5 rounded-full ${callActive ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`} />
                <span className={callActive ? 'text-emerald-400 font-extrabold' : 'text-slate-300 font-semibold'}>
                  {callActive ? 'Call Connected' : 'Ready (On-Hook)'}
                </span>
                {callActive && (
                  <span className="font-mono text-cyan-300 font-black bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700 text-xs">
                    {timerMin}:{timerSec}
                  </span>
                )}
              </div>
            </div>

            {/* OLED Virtual Phone Screen */}
            <div className="relative bg-[#02050e] border border-emerald-500/30 rounded-2xl p-4 min-h-[110px] flex flex-col justify-between shadow-inner">
              <div className="text-xs font-mono font-bold text-emerald-400 leading-relaxed whitespace-pre-line select-text">
                <span className="text-emerald-500 font-black mr-2">&gt;</span>
                {displayText}
              </div>
              {isSpeaking && (
                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800 text-xs text-cyan-300 font-bold">
                  <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Speaking ({selectedLanguage.toUpperCase()})...</span>
                </div>
              )}
            </div>

            {/* Caller Identity Selector (Access Control Gateway) */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CALLING FROM (CALLER ID):</span>
                </span>
                <span className={`text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full ${
                  currentAuth.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : currentAuth.status === 'BLOCKED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {currentAuth.status === 'ACTIVE' ? '✔ Authorized' : currentAuth.status === 'BLOCKED' ? '🚫 Blocked' : '⛔ Unregistered'}
                </span>
              </div>

              <select
                value={selectedCallerNumber}
                onChange={(e) => setSelectedCallerNumber(e.target.value)}
                className="w-full bg-[#050c1c] border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-cyan-400 transition-colors cursor-pointer"
              >
                {registeredCallers.map((c) => (
                  <option key={c.phoneNumber} value={c.phoneNumber}>
                    {c.phoneNumber.startsWith('+1') ? '🇺🇸 ' : '🇮🇳 '}{c.phoneNumber} ({c.displayName}) [{c.status}]
                  </option>
                ))}
                <option value="+919999900000">⛔ +91 99999 00000 (Unregistered Stranger - Test Rejection)</option>
                <option value="+18000009999">⛔ +1 800 000 9999 (Unregistered International - Test Rejection)</option>
              </select>

              {/* Custom Caller Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or test custom phone number ..."
                  value={customCallerInput}
                  onChange={(e) => setCustomCallerInput(e.target.value)}
                  className="flex-1 bg-[#050c1c] border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customCallerInput.trim()) {
                      setSelectedCallerNumber(customCallerInput.trim());
                      setCustomCallerInput('');
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Dialpad 3x4 Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => {
                const subLabels: Record<string, string> = {
                  '1': 'TAMIL', '2': 'ENG', '3': 'HINDI',
                  '4': 'GHI', '5': 'JKL', '6': 'MNO',
                  '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
                  '*': 'RESET', '0': '', '#': 'MENU'
                };
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress(key)}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#0f1b36] to-[#071124] hover:from-[#172b54] hover:to-[#0d1e3d] active:scale-95 border border-slate-700/60 hover:border-cyan-400/60 transition-all shadow-md group cursor-pointer"
                  >
                    <span className="text-xl font-black text-white group-hover:text-cyan-300 leading-none">{key}</span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-1">{subLabels[key]}</span>
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
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  <span>Call Toll-Free (+1 573 859 5176)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleHangup}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-sm shadow-[0_0_20px_rgba(239,68,68,0.35)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              )}
            </div>

            {/* Audio Voice Speech Toggle */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-white transition-colors">
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
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* ─────────────────────────────────────────────────────────── */}
          {/* 1. LIVE TRANSMISSION TOWERS TELEMETRY & ISOLATION STATUS    */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="bg-[#091326] border border-cyan-500/35 rounded-3xl p-5 sm:p-6 shadow-[0_0_24px_rgba(6,182,212,0.12)] flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">Live Towers Telemetry &amp; Isolation Sync</h3>
                  <p className="text-xs text-slate-300 font-medium">Direct 2-Way Real-Time Synchronization with 3D Digital Twin</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isUsbConnected ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-400/60 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ESP32 USB Synced
                  </span>
                ) : (
                  <button
                    onClick={connectUsbSerial}
                    className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse cursor-pointer border border-rose-400 transition-all active:scale-95"
                    title="Click to connect your ESP32 via USB so physical tower lights respond"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>🔌 Connect ESP32 USB</span>
                  </button>
                )}
                <button
                  onClick={() => toggleHardwareLogic('INVERT')}
                  className="px-2.5 py-1 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-400/50 text-purple-300 font-mono text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Invert ON/OFF Relay Logic if physical lights are opposite"
                >
                  <span>🔄 Invert Polarity</span>
                </button>
                <span className="px-3.5 py-1 rounded-full bg-cyan-950 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-black flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live 3D Twin Store
                </span>
              </div>
            </div>

            {/* Dynamic Grid Summary Alert Banner matching reference mockup */}
            <div className={`p-3 rounded-2xl flex items-center gap-3 border text-xs font-bold transition-all ${
              isolatedCount > 0
                ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            }`}>
              <span className="text-base shrink-0">{isolatedCount > 0 ? '🚨' : '✔'}</span>
              <span>
                {isolatedCount > 0
                  ? `Fault Isolation Active – Tower ${isolatedTowers.join(', ')} is currently ISOLATED. Power supply is cut off. Real-time telemetry in sync with 3D Twin.`
                  : 'All Towers Normal – 5/5 transmission towers active and transmitting power smoothly. Normal line flow.'}
              </span>
            </div>

            {/* 5 Towers Grid with Full Picture of Tower Turning GREEN (Active) and RED (Isolated) */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
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
                        ? 'bg-gradient-to-b from-[#220a0e] to-[#110406] border-rose-500/80 shadow-[0_0_16px_rgba(239,68,68,0.3)] ring-1 ring-rose-500/40'
                        : 'bg-gradient-to-b from-[#061814] to-[#07131e] border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.2)] hover:border-emerald-400'
                    }`}
                  >
                    <div>
                      {/* Card Top: Tower Title & Live Badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-black text-xs text-white">Tower {towerNum} ({towerId})</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isIso
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isIso ? 'bg-white' : 'bg-emerald-400 animate-pulse'}`} />
                          {isIso ? 'ISOLATED' : 'ACTIVE'}
                        </span>
                      </div>

                      {/* PICTURE OF TOWER TURNING RED (ISOLATED) OR GREEN (ACTIVE) */}
                      <div className="p-1 rounded-xl bg-[#030712]/70 border border-slate-800/80 my-1 flex items-center justify-center">
                        <TowerGraphicSvg isIsolated={isIso} />
                      </div>

                      {/* Telemetry Metrics */}
                      <div className="flex flex-col gap-1 text-[11px] font-mono py-1">
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[10px] uppercase font-bold">LINE CURRENT :</span>
                          <span className={`font-black ${isIso ? 'text-rose-400' : 'text-emerald-400'}`}>{curVal}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[10px] uppercase font-bold">BUS VOLTAGE :</span>
                          <span className="text-white font-black">{voltVal}</span>
                        </div>
                        <div className={`text-[10px] font-black mt-1 text-center py-0.5 rounded ${
                          isIso ? 'text-rose-400 bg-rose-950/60' : 'text-emerald-300 bg-emerald-950/60'
                        }`}>
                          {isIso ? '✖ Power Cut Off' : '✔ Live Transmission'}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Dial & Isolate/Restore */}
                    <div className="flex flex-col gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleQuickDial(towerNum)}
                        className="w-full py-1.5 rounded-full bg-blue-600/30 hover:bg-blue-600/60 text-cyan-200 font-black text-xs flex items-center justify-center gap-1.5 transition-all border border-cyan-500/40 active:scale-95 cursor-pointer shadow-sm"
                        title={`Dial Tower ${towerNum} on Hotline`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Dial T{towerNum}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTowerToggle(towerId)}
                        className={`w-full py-1.5 rounded-full font-black text-xs transition-all active:scale-95 cursor-pointer shadow-sm ${
                          isIso
                            ? 'bg-emerald-600/40 hover:bg-emerald-600 text-emerald-200 border border-emerald-500/50 shadow-emerald-900/30'
                            : 'bg-rose-600/40 hover:bg-rose-600 text-rose-200 border border-rose-500/50 shadow-rose-900/30'
                        }`}
                        title={isIso ? 'Restore power transmission' : 'Isolate tower from grid'}
                      >
                        {isIso ? '⚡ Restore' : '⚙ Isolate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 2. REAL-TIME CALL TRANSCRIPT WITH SCROLL UP/DOWN CONTROLS   */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="bg-[#091326] border border-cyan-500/35 rounded-3xl p-5 sm:p-6 shadow-[0_0_24px_rgba(6,182,212,0.12)] flex flex-col gap-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white tracking-wide">Real-Time Call Transcript &amp; DTMF Log</h3>
              </div>

              {/* Scroll Up/Down & Clear Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollTranscript('up')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                  title="Scroll Up to see earlier logs"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scroll Up</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollTranscript('down')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                  title="Scroll Down to see latest logs"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scroll Down</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTranscript([{ type: 'system', time: new Date().toLocaleTimeString(), text: 'Log cleared.' }])}
                  className="text-xs text-slate-300 hover:text-white px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Clear Log</span>
                </button>
              </div>
            </div>

            {/* Scrollable Container with Smooth Scroll */}
            <div
              ref={transcriptContainerRef}
              className="bg-[#030612] border border-slate-800/90 rounded-2xl p-4 max-h-[170px] overflow-y-auto flex flex-col gap-1.5 font-mono text-xs shadow-inner scroll-smooth"
            >
              {transcript.map((entry, i) => (
                <div key={i} className="flex items-start gap-2.5 py-0.5 border-b border-slate-900/60 last:border-0">
                  <span className="text-slate-500 shrink-0 select-none">[{entry.time}]</span>
                  <span className={
                    entry.type === 'caller'
                      ? 'text-cyan-300 font-bold'
                      : entry.type === 'ivr'
                      ? 'text-emerald-300 font-medium'
                      : entry.type === 'alert'
                      ? 'text-rose-400 font-black'
                      : 'text-slate-400'
                  }>
                    {entry.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 3. AUTHORIZED CALLERS & ACCESS CONTROL (WHITELIST/BLOCKLIST)*/}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="bg-[#091326] border border-cyan-500/35 rounded-3xl p-5 sm:p-6 shadow-[0_0_24px_rgba(6,182,212,0.12)] flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white tracking-wide">Authorized Callers &amp; Access Control (Whitelist &amp; Blocklist)</h3>
              </div>

              {/* Stats Pills & Scroll Up/Down */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 font-bold">Total: {totalReg}</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">Active: {activeReg}</span>
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">Blocked: {blockedReg}</span>
                <button
                  type="button"
                  onClick={() => scrollCallersTable('up')}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                  title="Scroll Up Callers Table"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCallersTable('down')}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                  title="Scroll Down Callers Table"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Add Number Form */}
            <form onSubmit={handleAddCaller} className="bg-[#050c1c] border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-end shadow-sm">
              <div className="flex-1 min-w-[160px] flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">PHONE NUMBER (E.164):</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="bg-[#02050e] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex-1 min-w-[160px] flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">PERSONNEL NAME / UNIT:</label>
                <input
                  type="text"
                  placeholder="e.g. Substation Lead Officer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="bg-[#02050e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="w-[140px] flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">SECURITY ROLE:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="bg-[#02050e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="GRID_ADMIN">GRID ADMIN</option>
                  <option value="FIELD_TECH">FIELD TECH</option>
                  <option value="DISPATCHER">DISPATCHER</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register Number</span>
              </button>
            </form>

            {/* Registry Table with Up/Down Scroll */}
            <div
              ref={callersTableContainerRef}
              className="overflow-x-auto border border-slate-800/80 rounded-2xl max-h-[220px] scroll-smooth"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-[#040814] text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800 z-10">
                  <tr>
                    <th className="p-3">PHONE NUMBER</th>
                    <th className="p-3">AUTHORIZED PERSONNEL</th>
                    <th className="p-3">ROLE</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">ACCESS ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#060e20]">
                  {registeredCallers.map((caller) => {
                    const isBlocked = caller.status === 'BLOCKED';
                    return (
                      <tr key={caller.phoneNumber} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-cyan-300">{caller.phoneNumber}</td>
                        <td className="p-3 font-semibold text-white">{caller.displayName}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">{caller.role}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            isBlocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {isBlocked ? '● BLOCKED' : '● ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleBlockStatus(caller.phoneNumber)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isBlocked
                                ? 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 border border-emerald-500/40'
                                : 'bg-rose-600/30 hover:bg-rose-600 text-rose-200 border border-rose-500/40'
                            }`}
                          >
                            {isBlocked ? '✔ Unblock' : '⛔ Block'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCaller(caller.phoneNumber)}
                            title="Delete number"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 4. DATABASE CALL AUDIT LOG WITH SCROLL UP/DOWN CONTROLS     */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="bg-[#091326] border border-cyan-500/35 rounded-3xl p-5 sm:p-6 shadow-[0_0_24px_rgba(6,182,212,0.12)] flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white tracking-wide">Call Audit Log: Toll-Free Access &amp; Spoken Responses</h3>
              </div>

              {/* Scroll Up/Down & Clear DB */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollAuditLog('up')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                  title="Scroll Up Audit Log"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scroll Up</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollAuditLog('down')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                  title="Scroll Down Audit Log"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scroll Down</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCallLogs([])}
                  className="text-xs text-slate-300 hover:text-rose-400 px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear DB</span>
                </button>
              </div>
            </div>

            {/* Scrollable Table Container with Smooth Scroll */}
            <div
              ref={auditTableContainerRef}
              className="overflow-x-auto border border-slate-800/80 rounded-2xl max-h-[250px] scroll-smooth"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-[#040814] text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800 z-10">
                  <tr>
                    <th className="p-3">TIMESTAMP</th>
                    <th className="p-3">CALLER IDENTITY</th>
                    <th className="p-3">ACCESS RESULT</th>
                    <th className="p-3">LANG</th>
                    <th className="p-3">TOWER</th>
                    <th className="p-3">TELEMETRY</th>
                    <th className="p-3">SPOKEN AUDIO RESPONSE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#060e20]">
                  {callLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                        No toll-free calls recorded yet. Use the dialpad on the left to make your first call!
                      </td>
                    </tr>
                  ) : (
                    callLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-amber-300">{log.callerNumber}</div>
                          <div className="text-[10px] text-slate-400">{log.callerName}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {log.accessResult === 'AUTHORIZED' ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ✔ AUTHORIZED
                            </span>
                          ) : log.accessResult === 'BLOCKED' ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              🚫 BLOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              ⛔ UNREGISTERED
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold uppercase">{log.language}</td>
                        <td className="p-3 font-mono font-bold text-cyan-300">{log.towerId || '-'}</td>
                        <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                          <span className="text-white font-bold">{log.voltageV.toFixed(1)}V</span>{' '}
                          <span className={log.towerStatus === 'ISOLATED' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                            ({log.currentMa.toFixed(1)}mA)
                          </span>
                        </td>
                        <td className="p-3 max-w-[260px] truncate text-slate-300 text-[11px]" title={log.spokenResponse}>
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
