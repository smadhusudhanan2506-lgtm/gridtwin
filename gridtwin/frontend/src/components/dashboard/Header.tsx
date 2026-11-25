import React, { useState, useEffect } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Zap,
  Clock,
  Wifi,
  WifiOff,
  User,
  ChevronDown,
  PhoneCall,
  Menu,
  X,
  Lock
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    hardwareDevice,
    hardwareMode,
    setHardwareMode,
    isMobileNavOpen,
    toggleMobileNav,
    setActiveTab,
    isUsbConnected,
    connectUsbSerial,
    disconnectUsbSerial
  } = useGridStore();

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { hour12: true });
  const dateStr = time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="bg-[#050b1a]/95 border-b border-slate-800/80 text-white px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 select-none z-30 shadow-lg">
      {/* Left: Mobile Menu Toggle + Branding & Status */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Drawer Button */}
        <button
          onClick={toggleMobileNav}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title="Open Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          {isMobileNavOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5 text-cyan-400" />}
        </button>

        {/* Branding: Lightning bolt + GRIDTWIN > Digital Twin for Smart Grid */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-tight">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-white">
                GRIDTWIN
              </h1>
              <span className="text-cyan-400 text-sm font-black">&gt;</span>
            </div>
            <p className="hidden xs:block text-[10px] sm:text-xs text-slate-300 font-semibold leading-none mt-0.5">
              Digital Twin for Smart Grid
            </p>
          </div>
        </div>

        {/* System Online Pill Badge */}
        <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-black shadow-[0_0_12px_rgba(16,185,129,0.25)]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Online</span>
        </div>
      </div>

      {/* Center: Live Digital Clock with Circular Clock Icon */}
      <div className="hidden md:flex items-center gap-2.5 text-slate-300 font-mono">
        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
        <div className="flex items-center gap-2 leading-tight">
          <span className="text-xs sm:text-sm md:text-base font-black text-white tracking-wide">{timeStr}</span>
          <span className="hidden lg:inline text-xs sm:text-sm text-slate-300 font-semibold">{dateStr}</span>
        </div>
      </div>

      {/* Right: Helpline, Mode Selector, Hardware Connectivity, and User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toll-Free Helpline Pill */}
        <button
          onClick={() => setActiveTab('toll-free')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c1836] hover:bg-blue-950/90 border border-blue-500/50 text-blue-300 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] cursor-pointer"
          title="Open 24/7 Toll-Free Voice Hotline & Access Control"
        >
          <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
          <span>+1 573 859 5176 Helpline</span>
        </button>

        {/* Mode Selector Pill (Real Hardware / Simulation) */}
        <button
          onClick={() => setHardwareMode(hardwareMode === 'PHYSICAL' ? 'SIMULATION' : 'PHYSICAL')}
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:bg-emerald-900/60 cursor-pointer"
          title="Toggle Hardware Mode"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{hardwareMode === 'PHYSICAL' ? 'REAL HARDWARE' : 'SIMULATION'}</span>
        </button>

        {/* ESP32 Connectivity Pill (Interactive One-Click USB Web Serial Connect) */}
        <button
          type="button"
          onClick={() => {
            if (isUsbConnected || hardwareDevice.status === 'ONLINE') {
              disconnectUsbSerial();
            } else {
              connectUsbSerial();
            }
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all cursor-pointer ${
            hardwareDevice.status === 'ONLINE'
              ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-900/60'
              : 'bg-rose-950/70 border-rose-500/70 text-rose-300 shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:bg-rose-900/60 animate-pulse'
          }`}
          title={
            hardwareDevice.status === 'ONLINE'
              ? 'ESP32 Connected! Click to Disconnect USB'
              : 'Click to Connect your ESP32 directly via USB Cable (Chrome Web Serial)'
          }
        >
          {hardwareDevice.status === 'ONLINE' ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className="text-white font-bold tracking-tight">
            {hardwareDevice.status === 'ONLINE'
              ? (isUsbConnected ? 'ESP32 ONLINE (USB)' : 'ESP32 ONLINE')
              : '🔌 CONNECT ESP32 (USB)'}
          </span>
          {hardwareDevice.status !== 'ONLINE' && (
            <Lock className="w-3 h-3 text-rose-400 ml-0.5" />
          )}
        </button>

        {/* User Profile Avatar with Name & Chevron */}
        <div className="flex items-center gap-1.5 pl-1 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-600/40 group-hover:scale-105 transition-transform">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white hidden md:inline tracking-wide">Madhu</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </div>
      </div>
    </header>
  );
};
