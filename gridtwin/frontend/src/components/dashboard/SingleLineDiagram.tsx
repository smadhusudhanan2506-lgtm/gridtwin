import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import { SwitchState } from '../../types';
import {
  GitFork,
  Maximize2,
  TowerControl
} from 'lucide-react';

export const SingleLineDiagram: React.FC = () => {
  const {
    switches,
    toggleSwitch,
    bypassSwitchState,
    toggleBypassSwitch,
    isolatedTowerId,
    isolatedTowers = [],
    isReverseFeedActive,
    isolateTower,
    restoreNormalOperation,
  } = useGridStore();

  const isoList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] =
    isolatedTowers && isolatedTowers.length > 0
      ? isolatedTowers
      : (isolatedTowerId ? [isolatedTowerId] : []);

  const isBypassClosed = bypassSwitchState === 'CLOSED';
  const switchMap = switches.reduce((acc, s) => ({ ...acc, [s.switch_id]: s.state }), {} as Record<string, SwitchState>);

  const isT1Iso = isoList.includes('T1');
  const isT2Iso = isoList.includes('T2');
  const isT3Iso = isoList.includes('T3');
  const isT4Iso = isoList.includes('T4');
  const isT5Iso = isoList.includes('T5');

  const mainReachT1 = !isT1Iso;
  const mainReachT2 = mainReachT1 && !isT2Iso;
  const mainReachT3 = mainReachT2 && !isT3Iso;
  const mainReachT4 = mainReachT3 && !isT4Iso;
  const mainReachT5 = mainReachT4 && !isT5Iso;

  const t1Live = isReverseFeedActive || (!isT1Iso && (mainReachT1 || isBypassClosed));
  const t2Live = isReverseFeedActive || (!isT2Iso && (mainReachT2 || isBypassClosed));
  const t3Live = isReverseFeedActive || (!isT3Iso && (mainReachT3 || isBypassClosed));
  const t4Live = isReverseFeedActive || (!isT4Iso && (mainReachT4 || isBypassClosed));
  const t5Live = isReverseFeedActive || (!isT5Iso && (mainReachT5 || isBypassClosed));

  const sections = [
    {
      id: 'T1' as const,
      swId: 'SW-T1',
      name: 'Tower 1',
      loadName: 'Residential Quarter',
      demandKw: '345.5 kW',
      x: 210,
      isLive: t1Live,
      isIso: isT1Iso,
      category: 'residential',
    },
    {
      id: 'T2' as const,
      swId: 'SW-T2',
      name: 'Tower 2',
      loadName: 'Commercial Center',
      demandKw: '520 kW',
      x: 360,
      isLive: t2Live,
      isIso: isT2Iso,
      category: 'commercial',
    },
    {
      id: 'T3' as const,
      swId: 'SW-T3',
      name: 'Tower 3',
      loadName: 'Hospital & ER',
      demandKw: '412.8 kW',
      x: 510,
      isLive: t3Live,
      isIso: isT3Iso,
      category: 'critical',
    },
    {
      id: 'T4' as const,
      swId: 'SW-T4',
      name: 'Tower 4',
      loadName: 'Heavy Manufacturing',
      demandKw: '685 kW',
      x: 660,
      isLive: t4Live,
      isIso: isT4Iso,
      category: 'industrial',
    },
    {
      id: 'T5' as const,
      swId: 'SW-T5',
      name: 'Tower 5',
      loadName: 'Solar Farm & BESS',
      demandKw: '210.4 kW',
      x: 810,
      isLive: t5Live,
      isIso: isT5Iso,
      category: 'renewable',
    },
  ];

  const handleTowerClick = (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    isolateTower(towerId);
  };

  return (
    <div className="w-full bg-[#081329]/95 border border-cyan-500/35 rounded-3xl p-4 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.14)] select-none flex flex-col gap-4 relative overflow-hidden">
      {/* Background Transmission Pylon Silhouette Glow */}
      <div className="absolute right-4 top-2 pointer-events-none opacity-15">
        <svg width="180" height="90" viewBox="0 0 200 100" fill="none" stroke="#00f0ff" strokeWidth="1.5">
          <line x1="80" y1="95" x2="100" y2="10" />
          <line x1="120" y1="95" x2="100" y2="10" />
          <line x1="70" y1="40" x2="130" y2="40" />
          <line x1="80" y1="60" x2="120" y2="60" />
          <line x1="88" y1="78" x2="112" y2="78" />
        </svg>
      </div>

      {/* 1. Header Matching Reference Mockup */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <TowerControl className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              2D Lab – Five-Tower Transmission &amp; Front Bypass Schematic
            </h2>
            <p className="text-xs font-medium text-slate-300 mt-0.5">
              {isBypassClosed && isoList.length > 0
                ? `Bypass Active: Isolation barrier active around [${isoList.join(', ')}] | Downstream fed via Front Bypass Bus`
                : isBypassClosed
                ? 'Bypass ON: Alternate bypass bus energized in parallel (standby ready) | All 5 towers energized'
                : isoList.length > 0
                ? `ALERT: Tower [${isoList.join(', ')}] Isolated! Turn Bypass ON to backfeed downstream loads.`
                : 'Normal State: All 5 towers energized via main overhead transmission corridor | Bypass bus in standby'}
            </p>
          </div>
        </div>

        {/* Action Badges on Right */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={restoreNormalOperation}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all active:scale-95 cursor-pointer ${
              !isBypassClosed && isoList.length === 0
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/25'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Normal State</span>
          </button>

          <button
            onClick={toggleBypassSwitch}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all active:scale-95 cursor-pointer ${
              isBypassClosed
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/70 shadow-[0_0_14px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBypassClosed ? 'Bypass Active' : 'Bypass Standby'}</span>
          </button>

          <button
            onClick={() => {
              const elem = document.documentElement;
              if (!document.fullscreenElement) {
                elem.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.().catch(() => {});
              }
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Full High-Precision 2D SVG Schematic */}
      <div className="w-full bg-[#040a1b] border border-cyan-500/25 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
        {/* Subtle Cyber Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#00f0ff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <svg viewBox="0 0 1000 460" className="w-full max-w-6xl h-auto drop-shadow-2xl z-10 select-none">
          <defs>
            <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* A. 33/11kV PRIMARY SUBSTATION (SOURCE) ON LEFT              */}
          {/* ─────────────────────────────────────────────────────────── */}
          <g transform="translate(75, 145)">
            <rect
              x="-40"
              y="-36"
              width="80"
              height="72"
              rx="12"
              fill="#061838"
              stroke="#00f0ff"
              strokeWidth="2.5"
              filter="url(#glow-cyan)"
            />
            {/* Transformer Dual Overlapping Coils */}
            <circle cx="-12" cy="0" r="16" fill="none" stroke="#00f0ff" strokeWidth="2.5" />
            <circle cx="12" cy="0" r="16" fill="none" stroke="#00f0ff" strokeWidth="2.5" />
            <text x="0" y="54" fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold">
              33/11kV Substation
            </text>
            <text x="0" y="68" fill="#00f0ff" fontSize="9.5" textAnchor="middle" fontWeight="black" fontFamily="monospace">
              GRID SOURCE (LIVE)
            </text>
          </g>

          {/* Incomer Line: Substation -> Tower 1 */}
          <line
            x1="115"
            y1="145"
            x2="182"
            y2="145"
            stroke={t1Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3.5"
            strokeDasharray={t1Live ? undefined : '6 4'}
          />
          {t1Live && (
            <path d="M 148 141 L 156 145 L 148 149 Z" fill="#00f0ff" />
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* B. MAIN OVERHEAD TRANSMISSION SPANS & INTERLINK SWITCHES    */}
          {/* ─────────────────────────────────────────────────────────── */}
          {/* T1 -> SW-T2 -> T2 */}
          <line
            x1="238"
            y1="145"
            x2="271"
            y2="145"
            stroke={t1Live && t2Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t1Live && t2Live ? undefined : '5 4'}
          />
          <g transform="translate(285, 145)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T2')}>
            <rect
              x="-14"
              y="-12"
              width="28"
              height="24"
              rx="6"
              fill="#06281e"
              stroke={switchMap['SW-T2'] === 'CLOSED' ? '#10b981' : '#ef4444'}
              strokeWidth="2"
            />
            {/* Arrow symbol -> */}
            <line x1="-6" y1="0" x2="5" y2="0" stroke={switchMap['SW-T2'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" />
            <path d="M 1 -3 L 5 0 L 1 3" stroke={switchMap['SW-T2'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">SW-T2</text>
          </g>
          <line
            x1="299"
            y1="145"
            x2="332"
            y2="145"
            stroke={t1Live && t2Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t1Live && t2Live ? undefined : '5 4'}
          />
          {t1Live && t2Live && <path d="M 315 141 L 323 145 L 315 149 Z" fill="#00f0ff" />}

          {/* T2 -> SW-T3 -> T3 */}
          <line
            x1="388"
            y1="145"
            x2="421"
            y2="145"
            stroke={t2Live && t3Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t2Live && t3Live ? undefined : '5 4'}
          />
          <g transform="translate(435, 145)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T3')}>
            <rect
              x="-14"
              y="-12"
              width="28"
              height="24"
              rx="6"
              fill="#06281e"
              stroke={switchMap['SW-T3'] === 'CLOSED' ? '#10b981' : '#ef4444'}
              strokeWidth="2"
            />
            <line x1="-6" y1="0" x2="5" y2="0" stroke={switchMap['SW-T3'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" />
            <path d="M 1 -3 L 5 0 L 1 3" stroke={switchMap['SW-T3'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">SW-T3</text>
          </g>
          <line
            x1="449"
            y1="145"
            x2="482"
            y2="145"
            stroke={t2Live && t3Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t2Live && t3Live ? undefined : '5 4'}
          />
          {t2Live && t3Live && <path d="M 465 141 L 473 145 L 465 149 Z" fill="#00f0ff" />}

          {/* T3 -> SW-T4 -> T4 */}
          <line
            x1="538"
            y1="145"
            x2="571"
            y2="145"
            stroke={t3Live && t4Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t3Live && t4Live ? undefined : '5 4'}
          />
          <g transform="translate(585, 145)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T4')}>
            <rect
              x="-14"
              y="-12"
              width="28"
              height="24"
              rx="6"
              fill="#06281e"
              stroke={switchMap['SW-T4'] === 'CLOSED' ? '#10b981' : '#ef4444'}
              strokeWidth="2"
            />
            <line x1="-6" y1="0" x2="5" y2="0" stroke={switchMap['SW-T4'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" />
            <path d="M 1 -3 L 5 0 L 1 3" stroke={switchMap['SW-T4'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">SW-T4</text>
          </g>
          <line
            x1="599"
            y1="145"
            x2="632"
            y2="145"
            stroke={t3Live && t4Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t3Live && t4Live ? undefined : '5 4'}
          />
          {t3Live && t4Live && <path d="M 615 141 L 623 145 L 615 149 Z" fill="#00f0ff" />}

          {/* T4 -> SW-T5 -> T5 */}
          <line
            x1="688"
            y1="145"
            x2="721"
            y2="145"
            stroke={t4Live && t5Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t4Live && t5Live ? undefined : '5 4'}
          />
          <g transform="translate(735, 145)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T5')}>
            <rect
              x="-14"
              y="-12"
              width="28"
              height="24"
              rx="6"
              fill="#06281e"
              stroke={switchMap['SW-T5'] === 'CLOSED' ? '#10b981' : '#ef4444'}
              strokeWidth="2"
            />
            <line x1="-6" y1="0" x2="5" y2="0" stroke={switchMap['SW-T5'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" />
            <path d="M 1 -3 L 5 0 L 1 3" stroke={switchMap['SW-T5'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">SW-T5</text>
          </g>
          <line
            x1="749"
            y1="145"
            x2="782"
            y2="145"
            stroke={t4Live && t5Live ? '#00f0ff' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={t4Live && t5Live ? undefined : '5 4'}
          />
          {t4Live && t5Live && <path d="M 765 141 L 773 145 L 765 149 Z" fill="#00f0ff" />}

          {/* Overhead Red Isolation Barriers (XX) when a tower is isolated */}
          {isT1Iso && (
            <g>
              <g transform="translate(148, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
              <g transform="translate(254, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
            </g>
          )}

          {isT2Iso && (
            <g>
              <g transform="translate(254, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
              <g transform="translate(404, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
            </g>
          )}

          {isT3Iso && (
            <g>
              <g transform="translate(404, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
              <g transform="translate(554, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
            </g>
          )}

          {isT4Iso && (
            <g>
              <g transform="translate(554, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
              <g transform="translate(704, 145)">
                <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
              </g>
            </g>
          )}

          {isT5Iso && (
            <g transform="translate(704, 145)">
              <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#2d0a0a" stroke="#ef4444" strokeWidth="1.5" />
              <text x="0" y="4.5" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="black">XX</text>
            </g>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* C. FIVE TRANSMISSION TOWERS (T1 TO T5) & CONSUMER BRANCHES */}
          {/* ─────────────────────────────────────────────────────────── */}
          {sections.map((sec) => {
            const towerColor = sec.isIso ? '#ef4444' : '#00f0ff';
            const branchColor = sec.isIso ? '#ef4444' : sec.isLive ? '#00f0ff' : '#475569';
            const loadBorderColor = sec.isLive ? '#0099ff' : '#ef4444';

            return (
              <g key={sec.id}>
                {/* 1. Header Pill: Tower Name + Status ON/ISOLATED */}
                <g transform={`translate(${sec.x}, 94)`}>
                  <rect
                    x="-32"
                    y="-14"
                    width="64"
                    height="26"
                    rx="7"
                    fill="#061838"
                    stroke={sec.isIso ? '#ef4444' : '#0284c7'}
                    strokeWidth="1.2"
                  />
                  <text x="0" y="-1" fill="#ffffff" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                    {sec.name}
                  </text>
                  <text
                    x="0"
                    y="10"
                    fill={sec.isIso ? '#ef4444' : '#10b981'}
                    fontSize="8"
                    textAnchor="middle"
                    fontWeight="black"
                    fontFamily="monospace"
                  >
                    {sec.isIso ? '● ISOLATED' : '● ON'}
                  </text>
                </g>

                {/* 2. Main Tower Circular Node with Lattice Pylon Vector Graphic */}
                <g
                  transform={`translate(${sec.x}, 145)`}
                  className="cursor-pointer group"
                  onClick={() => handleTowerClick(sec.id)}
                >
                  {/* Outer Glowing Circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r="28"
                    fill={sec.isIso ? '#2d0a0a' : '#061938'}
                    stroke={towerColor}
                    strokeWidth="2.5"
                    filter={sec.isIso ? 'url(#glow-red)' : 'url(#glow-cyan)'}
                    className="transition-colors duration-300"
                  />
                  {/* Concentric Decorative Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r="23"
                    fill="none"
                    stroke={towerColor}
                    strokeWidth="1"
                    strokeDasharray="3 2"
                    opacity="0.6"
                  />

                  {/* Steel Lattice Transmission Pylon Vector Glyph */}
                  <g stroke={towerColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="-9" y1="14" x2="0" y2="-14" />
                    <line x1="9" y1="14" x2="0" y2="-14" />
                    <line x1="-15" y1="1" x2="15" y2="1" />
                    <line x1="-10" y1="-5" x2="10" y2="-5" />
                    <line x1="-7" y1="9" x2="7" y2="9" />
                    <circle cx="0" cy="-14" r="1.5" fill={towerColor} />
                  </g>
                </g>

                {/* 3. Vertical Feeder: Tower -> Breaker -> Transformer -> Consumer Load */}
                {/* Line: Tower Node -> Breaker Switch */}
                <line
                  x1={sec.x}
                  y1="173"
                  x2={sec.x}
                  y2="198"
                  stroke={branchColor}
                  strokeWidth="2.5"
                  strokeDasharray={sec.isLive ? undefined : '4 3'}
                />

                {/* Feeder Disconnect Switch Box: [-] */}
                <g transform={`translate(${sec.x}, 206)`} className="cursor-pointer" onClick={() => handleTowerClick(sec.id)}>
                  <rect
                    x="-9"
                    y="-8"
                    width="18"
                    height="16"
                    rx="4"
                    fill="#071b38"
                    stroke={branchColor}
                    strokeWidth="1.5"
                  />
                  <line x1="-5" y1="0" x2="5" y2="0" stroke={branchColor} strokeWidth="2.5" />
                </g>

                {/* Line: Breaker Switch -> Transformer */}
                <line
                  x1={sec.x}
                  y1="214"
                  x2={sec.x}
                  y2="232"
                  stroke={branchColor}
                  strokeWidth="2.5"
                />

                {/* Local Distribution Step-down Transformer: 11kV/415V */}
                <g transform={`translate(${sec.x}, 242)`}>
                  <circle cx="0" cy="-6" r="8.5" fill="none" stroke={branchColor} strokeWidth="2" />
                  <circle cx="0" cy="6" r="8.5" fill="none" stroke={branchColor} strokeWidth="2" />
                  <text x="14" y="3.5" fill="#67e8f9" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    11kV/415V
                  </text>
                </g>

                {/* Line: Transformer -> Consumer Load Card */}
                <line
                  x1={sec.x}
                  y1="254"
                  x2={sec.x}
                  y2="278"
                  stroke={branchColor}
                  strokeWidth="2.5"
                />

                {/* 4. Consumer Load Card at Bottom */}
                <g transform={`translate(${sec.x}, 302)`}>
                  <rect
                    x="-46"
                    y="-23"
                    width="92"
                    height="46"
                    rx="10"
                    fill="#061838"
                    stroke={loadBorderColor}
                    strokeWidth="2"
                    filter="url(#glow-cyan)"
                  />

                  {/* Specific Vector Glyph for each consumer load */}
                  {sec.id === 'T1' && (
                    <g transform="translate(-32, -2)" stroke="#00f0ff" strokeWidth="1.4" fill="none">
                      <rect x="-6" y="-7" width="12" height="15" rx="1" fill="#0c234a" />
                      <line x1="-3" y1="-4" x2="-3" y2="-2" />
                      <line x1="3" y1="-4" x2="3" y2="-2" />
                      <line x1="-3" y1="1" x2="-3" y2="3" />
                      <line x1="3" y1="1" x2="3" y2="3" />
                    </g>
                  )}

                  {sec.id === 'T2' && (
                    <g transform="translate(-32, -2)" stroke="#00f0ff" strokeWidth="1.4" fill="none">
                      <circle cx="0" cy="0" r="7" stroke="#00f0ff" fill="#0c234a" />
                      <path d="M -3 1 L 0 -4 L 3 1" />
                    </g>
                  )}

                  {sec.id === 'T3' && (
                    <g transform="translate(-32, -2)">
                      <rect x="-7" y="-7" width="14" height="14" rx="3" fill="#ef4444" />
                      <path d="M -2 -5 H 2 V -2 H 5 V 2 H 2 V 5 H -2 V 2 H -5 V -2 H -2 Z" fill="#ffffff" />
                    </g>
                  )}

                  {sec.id === 'T4' && (
                    <g transform="translate(-32, -2)" stroke="#00f0ff" strokeWidth="1.4" fill="none">
                      <path d="M -7 5 L -7 -2 L -3 1 L -3 -2 L 1 1 L 1 -5 L 5 -5 L 5 5 Z" fill="#0c234a" />
                    </g>
                  )}

                  {sec.id === 'T5' && (
                    <g transform="translate(-32, -2)" stroke="#00f0ff" strokeWidth="1.3" fill="none">
                      <rect x="-7" y="-6" width="14" height="12" rx="2" fill="#0c234a" />
                      <line x1="-7" y1="0" x2="7" y2="0" />
                      <line x1="-2" y1="-6" x2="-2" y2="6" />
                      <line x1="2" y1="-6" x2="2" y2="6" />
                    </g>
                  )}

                  {/* Load Name & Demand Value */}
                  <text x="6" y="-5" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                    {sec.loadName}
                  </text>
                  <text
                    x="6"
                    y="10"
                    fill={sec.isLive ? '#34d399' : '#ef4444'}
                    fontSize="10.5"
                    textAnchor="middle"
                    fontWeight="black"
                    fontFamily="monospace"
                  >
                    {sec.isLive ? sec.demandKw : '0 kW (OFF)'}
                  </text>
                </g>

                {/* 5. Vertical Riser Line: Connecting Bottom Green Bypass Bus up to Load */}
                <line
                  x1={sec.x}
                  y1="390"
                  x2={sec.x}
                  y2="325"
                  stroke={isBypassClosed && !sec.isIso ? '#10b981' : '#047857'}
                  strokeWidth="2"
                  strokeDasharray={isBypassClosed ? undefined : '4 3'}
                />
                <circle cx={sec.x} cy="390" r="3.5" fill={isBypassClosed ? '#10b981' : '#047857'} />
              </g>
            );
          })}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* D. CONTINUOUS GREEN BYPASS BUS LINE (ACROSS Y = 390)        */}
          {/* ─────────────────────────────────────────────────────────── */}
          {/* Drop line from Substation to Bypass Bus */}
          <line
            x1="75"
            y1="181"
            x2="75"
            y2="390"
            stroke="#10b981"
            strokeWidth="3.5"
            filter="url(#glow-green)"
          />
          <path d="M 71 270 L 75 278 L 79 270 Z" fill="#10b981" />

          {/* Left Horizontal Run: Substation -> Central Bypass Switch */}
          <line
            x1="75"
            y1="390"
            x2="430"
            y2="390"
            stroke="#10b981"
            strokeWidth="3.5"
            filter="url(#glow-green)"
          />
          {/* Flow Directional Arrows */}
          <path d="M 175 386 L 183 390 L 175 394 Z" fill="#10b981" />
          <path d="M 325 386 L 333 390 L 325 394 Z" fill="#10b981" />

          {/* Central Front Bypass Bus Switch Card */}
          <g transform="translate(510, 390)" className="cursor-pointer" onClick={toggleBypassSwitch}>
            <rect
              x="-78"
              y="-18"
              width="156"
              height="36"
              rx="10"
              fill={isBypassClosed ? '#052b20' : '#1e113a'}
              stroke={isBypassClosed ? '#10b981' : '#6b7280'}
              strokeWidth="2.5"
              filter={isBypassClosed ? 'url(#glow-green)' : undefined}
            />
            {/* Horizontal Arrow Icon + Label */}
            <text x="0" y="-3" fill="#ffffff" fontSize="10.5" textAnchor="middle" fontWeight="black">
              ⇄ Bypass Bus Switch
            </text>
            <text
              x="0"
              y="11"
              fill={isBypassClosed ? '#34d399' : '#f87171'}
              fontSize="10"
              textAnchor="middle"
              fontWeight="black"
              fontFamily="monospace"
            >
              {isBypassClosed ? 'CLOSED (ACTIVE)' : 'OPEN (STANDBY)'}
            </text>
          </g>

          {/* Right Horizontal Run: Central Bypass Switch -> T5 */}
          <line
            x1="590"
            y1="390"
            x2="810"
            y2="390"
            stroke="#10b981"
            strokeWidth="3.5"
            filter="url(#glow-green)"
          />
          <path d="M 645 386 L 653 390 L 645 394 Z" fill="#10b981" />
          <path d="M 755 386 L 763 390 L 755 394 Z" fill="#10b981" />
        </svg>
      </div>
    </div>
  );
};
