import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Home,
  Box,
  Layers,
  Activity,
  Cpu,
  Bell,
  BarChart3,
  Settings,
  X,
  PhoneCall,
  TowerControl,
  Atom
} from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab, isMobileNavOpen, setMobileNavOpen, hardwareDevice } = useGridStore();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, badge: null },
    { id: '3d-twin', label: '3D Lab', icon: Box, badge: null },
    { id: 'sld', label: '2D Lab', icon: Layers, badge: null },
    { id: 'toll-free', label: 'Toll-Free', icon: PhoneCall, badge: 'HOTLINE' },
    { id: 'overview', label: 'Grid Overview', icon: TowerControl, badge: null },
    { id: 'monitoring', label: 'Monitoring', icon: Activity, badge: null },
    { id: 'hardware', label: 'Devices', icon: Cpu, badge: null },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: '2' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  const handleNavClick = (id: string) => {
    if (id === '3d-twin') {
      setActiveTab('3d-twin');
    } else if (id === 'sld') {
      setActiveTab('sld');
    } else if (id === 'dashboard') {
      setActiveTab('dashboard');
    } else {
      setActiveTab(id as any);
    }
    setMobileNavOpen(false);
  };

  const renderNavContent = () => (
    <>
      <div className="flex flex-col gap-1.5 sm:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.id === 'dashboard' && (activeTab === 'dashboard' || (activeTab as any) === 'home')) ||
            (item.id === '3d-twin' && activeTab === '3d-twin') ||
            (item.id === 'sld' && activeTab === 'sld') ||
            (item.id === 'toll-free' && activeTab === 'toll-free') ||
            (item.id === 'overview' && (activeTab as any) === 'overview') ||
            (item.id === 'monitoring' && (activeTab as any) === 'monitoring') ||
            (item.id === 'hardware' && activeTab === 'hardware') ||
            (item.id === 'analytics' && activeTab === 'analytics') ||
            (item.id === 'alerts' && (activeTab as any) === 'alerts') ||
            (item.id === 'settings' && (activeTab as any) === 'settings');

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-bold transition-all duration-200 group cursor-pointer ${
                isActive
                  ? 'bg-[#1d64ec] text-white shadow-[0_0_22px_rgba(29,100,236,0.55)] border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-3.5">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'
                  }`}
                />
                <span className="tracking-wide text-sm sm:text-base font-bold">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm shadow-rose-900/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Bottom Widgets */}
      <div className="mt-auto flex flex-col gap-2.5 pt-4">
        {/* Project Card matching mockup */}
        <div className="bg-[#081329]/90 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Atom className="w-4 h-4 text-purple-400" />
            <span className="text-xs sm:text-sm font-black text-slate-200 tracking-wide">Project</span>
          </div>
          <p className="text-xs text-slate-200 font-bold">
            Distribution Digital Twin Lab
          </p>
          <span className="text-xs text-slate-400 font-mono block mt-1">
            v1.0.0
          </span>
        </div>

        {/* System Running Pill matching mockup */}
        <div className="bg-[#081329]/90 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-white tracking-wide">System Running</span>
            </div>
            <span className="text-xs text-slate-300 font-semibold block mt-1">
              {hardwareDevice.status === 'ONLINE' ? 'ESP32 Connected' : 'ESP32 Standby'}
            </span>
          </div>
          <div className="flex items-end gap-1 h-3.5">
            <span className="w-1 bg-emerald-400 h-2 rounded-sm" />
            <span className="w-1 bg-emerald-400 h-3 rounded-sm" />
            <span className="w-1 bg-emerald-400 h-4 rounded-sm" />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#050b1a]/95 border-r border-slate-800/80 p-3 sm:p-4 select-none shrink-0 relative z-20">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Mobile Off-canvas Slide-over Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[#050b1a] border-r border-slate-800 z-50 p-4 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">GT</span>
            </div>
            <span className="font-black text-white text-base">Navigation</span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {renderNavContent()}
        </div>
      </div>
    </>
  );
};
