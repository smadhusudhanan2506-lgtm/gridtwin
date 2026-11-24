import React, { useEffect, useState } from 'react';
import { useGridStore } from './store/useGridStore';
import { Header } from './components/dashboard/Header';
import { KPIBar } from './components/dashboard/KPIBar';
import { LeftSidebar } from './components/dashboard/LeftSidebar';
import { GridCanvas } from './components/3d/GridCanvas';
import { SingleLineDiagram } from './components/dashboard/SingleLineDiagram';
import { DashboardOperationsCenter } from './components/dashboard/DashboardOperationsCenter';
import { SwitchControlPanel } from './components/dashboard/SwitchControlPanel';
import { MetricsChart } from './components/dashboard/MetricsChart';
import { EventLogFeed } from './components/dashboard/EventLogFeed';
import { HardwareBridgePanel } from './components/dashboard/HardwareBridgePanel';
import { ScenarioLabPanel } from './components/dashboard/ScenarioLabPanel';
import { ElementInspectorModal } from './components/dashboard/ElementInspectorModal';
import { TowerDetailsPanel } from './components/dashboard/TowerDetailsPanel';
import { TollFreePanel } from './components/dashboard/TollFreePanel';

export function App() {
  const { activeTab, syncWithBackendData, fetchHardwareStatus, handleWebSocketMessage } = useGridStore();
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: true }));

  // Polling & Live WebSocket effect for bidirectional hardware communication
  useEffect(() => {
    let isSubscribed = true;
    let ws: WebSocket | null = null;
    let wsReconnectTimeout: any = null;

    const BACKEND_URL = (
      import.meta.env.VITE_BACKEND_URL || 
      import.meta.env.VITE_API_BASE_URL || 
      (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
        ? 'https://gridtwin-backend.onrender.com'
        : '')
    ).replace(/\/$/, '');

    // Initial hardware state sync
    fetchHardwareStatus();

    const checkBackend = async () => {
      try {
        await fetchHardwareStatus();
        const res = await fetch(`${BACKEND_URL}/api/dashboard/summary`);
        if (res.ok && isSubscribed) {
          const data = await res.json();
          syncWithBackendData(data);
          setLastUpdatedTime(new Date().toLocaleTimeString('en-US', { hour12: true }));
        }
      } catch {
        // Standalone fallback
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 2000);

    // Live WebSocket connection to FastAPI backend
    const connectWS = () => {
      if (!isSubscribed) return;
      let wsUrl = '';
      if (BACKEND_URL) {
        const wsProtocol = BACKEND_URL.startsWith('https:') ? 'wss:' : 'ws:';
        const cleanHost = BACKEND_URL.replace(/^https?:\/\//, '');
        wsUrl = `${wsProtocol}//${cleanHost}/ws`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: 'request_state' }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleWebSocketMessage(msg.type, msg.data || msg);
          } catch (e) {
            console.error('WS JSON parse error:', e);
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            wsReconnectTimeout = setTimeout(connectWS, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (isSubscribed) {
          wsReconnectTimeout = setTimeout(connectWS, 3000);
        }
      }
    };

    connectWS();

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (wsReconnectTimeout) clearTimeout(wsReconnectTimeout);
      if (ws) ws.close();
    };
  }, [fetchHardwareStatus, handleWebSocketMessage, syncWithBackendData]);

  return (
    <div className="h-screen bg-[#040a1b] text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Ambient Horizon & Transmission Pylon Silhouette Background matching reference design */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-25">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030716] via-[#040c24] to-[#020512]" />
        {/* Horizon Glow at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-cyan-950/40 via-blue-950/20 to-transparent" />
        
        {/* Left Bottom Silhouette: Transmission Tower & Pine Trees */}
        <svg className="absolute bottom-0 left-0 w-80 h-48 select-none" viewBox="0 0 320 200" fill="none">
          <g stroke="#00f0ff" strokeWidth="1.5" opacity="0.6">
            <line x1="80" y1="200" x2="110" y2="40" />
            <line x1="140" y1="200" x2="110" y2="40" />
            <line x1="65" y1="90" x2="155" y2="90" />
            <line x1="80" y1="125" x2="140" y2="125" />
            <line x1="90" y1="160" x2="130" y2="160" />
            <line x1="92" y1="160" x2="128" y2="125" />
            <line x1="128" y1="160" x2="92" y2="125" />
          </g>
          <path d="M 10 200 L 25 140 L 40 200 Z" fill="#030818" stroke="#00f0ff" strokeWidth="0.8" opacity="0.5" />
          <path d="M 30 200 L 48 130 L 66 200 Z" fill="#030818" stroke="#00f0ff" strokeWidth="0.8" opacity="0.5" />
          <path d="M 160 200 L 175 145 L 190 200 Z" fill="#030818" stroke="#00f0ff" strokeWidth="0.8" opacity="0.5" />
        </svg>

        {/* Right Bottom Silhouette: Transmission Towers */}
        <svg className="absolute bottom-0 right-0 w-80 h-48 select-none" viewBox="0 0 320 200" fill="none">
          <g stroke="#00f0ff" strokeWidth="1.5" opacity="0.6">
            <line x1="200" y1="200" x2="230" y2="35" />
            <line x1="260" y1="200" x2="230" y2="35" />
            <line x1="185" y1="85" x2="275" y2="85" />
            <line x1="200" y1="120" x2="260" y2="120" />
            <line x1="210" y1="155" x2="250" y2="155" />
            <line x1="212" y1="155" x2="248" y2="120" />
            <line x1="248" y1="155" x2="212" y2="120" />
          </g>
          <path d="M 130 200 L 150 135 L 170 200 Z" fill="#030818" stroke="#00f0ff" strokeWidth="0.8" opacity="0.5" />
          <path d="M 275 200 L 290 145 L 305 200 Z" fill="#030818" stroke="#00f0ff" strokeWidth="0.8" opacity="0.5" />
        </svg>
      </div>

      {/* 1. SCADA Global Top Header */}
      <Header />

      {/* 2. Main Workspace: Left Sidebar on left, then KPI Bar + Full Width Center Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Navigation Sidebar */}
        <LeftSidebar />

        {/* Center Section: KPI Bar (Home Only) + Main Center Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top 6-Card KPI Bar - ONLY shown on Home page */}
          {(activeTab === 'dashboard' || (activeTab as any) === 'home') && <KPIBar />}

          {/* Central Dynamic Content Viewport */}
          {activeTab === '3d-twin' ? (
            <main className="flex-1 w-full h-full p-1 sm:p-1.5 overflow-hidden flex flex-col bg-[#050b18]">
              <GridCanvas />
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-3.5 sm:gap-5 bg-transparent">
              {/* A. DASHBOARD VIEW ("Home"): 2D Schematic + Center Operations Center */}
              {(activeTab === 'dashboard' || (activeTab as any) === 'home') && (
                <div className="flex flex-col gap-3.5 sm:gap-5">
                  {/* 2D Schematic Grid View */}
                  <SingleLineDiagram />

                  {/* Operations Center: Grid Operation, Live Readings, Tower Status, Quick Actions, How It Works */}
                  <DashboardOperationsCenter />
                </div>
              )}

            {/* C. 2D LAB (SLD Schematic View) */}
            {activeTab === 'sld' && (
              <div className="flex flex-col gap-5">
                <SingleLineDiagram />
                <SwitchControlPanel />
              </div>
            )}

            {/* TOLL-FREE HOTLINE & ACCESS CONTROL */}
            {activeTab === 'toll-free' && (
              <div className="flex flex-col gap-5">
                <TollFreePanel />
              </div>
            )}

            {/* D. GRID OVERVIEW (Full System Topology, Tower Details & Controls) */}
            {((activeTab as any) === 'overview' || (activeTab as any) === 'grid-overview') && (
              <div className="flex flex-col gap-5">
                <SingleLineDiagram />
                <TowerDetailsPanel />
                <SwitchControlPanel />
              </div>
            )}

            {/* D. MONITORING & ANALYTICS */}
            {(activeTab === 'analytics' || (activeTab as any) === 'monitoring') && (
              <div className="flex flex-col gap-5">
                <MetricsChart />
                <SwitchControlPanel />
                <EventLogFeed />
              </div>
            )}

            {/* E. DEVICES & HARDWARE BRIDGE */}
            {(activeTab === 'hardware' || (activeTab as any) === 'devices') && (
              <div className="flex flex-col gap-5">
                <HardwareBridgePanel />
              </div>
            )}

            {/* F. ALERTS */}
            {(activeTab as any) === 'alerts' && (
              <div className="flex flex-col gap-5">
                <EventLogFeed />
                <SwitchControlPanel />
              </div>
            )}

            {/* G. SETTINGS & SCENARIO LAB */}
            {(activeTab === 'scenarios' || (activeTab as any) === 'settings') && (
              <div className="flex flex-col gap-5">
                <ScenarioLabPanel />
                <SwitchControlPanel />
              </div>
            )}
          </main>
        )}
        </div>
      </div>

      {/* Element Inspector Modal */}
      <ElementInspectorModal />
    </div>
  );
}

export default App;

