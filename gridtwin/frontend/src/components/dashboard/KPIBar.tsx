import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Zap,
  Activity,
  Gauge,
  Power,
  Radio
} from 'lucide-react';

export const KPIBar: React.FC = () => {
  const { currentMetric, connectivity, hardwareDevice, ina219Telemetry } = useGridStore();

  const servedPercent = Math.round((connectivity.served_demand_kw / connectivity.total_demand_kw) * 100);
  const activeFeedersCount = connectivity.energized_loads.length;
  const isRealSensorActive = ina219Telemetry.sensor_status === 'OK' && ina219Telemetry.bus_voltage_v > 0.05;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 px-3 sm:px-6 py-2.5 sm:py-3 bg-[#060c1e]/90 select-none border-b border-slate-800/80">
      {/* KPI 1: Active Demand */}
      <div className="bg-[#081329] border border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_16px_rgba(16,185,129,0.12)] flex items-center gap-3 transition-all hover:border-emerald-400">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
            ACTIVE DEMAND
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
              {connectivity.served_demand_kw.toFixed(1)}
            </span>
            <span className="text-xs text-slate-300 font-mono font-bold">kW</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold block mt-0.5 truncate">
            {servedPercent}% Served
          </span>
        </div>
      </div>

      {/* KPI 2: Bus Voltage */}
      <div className="bg-[#081329] border border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_16px_rgba(6,182,212,0.12)] flex items-center gap-3 transition-all hover:border-cyan-400">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
            BUS VOLTAGE
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
              {isRealSensorActive
                ? ina219Telemetry.bus_voltage_v.toFixed(2)
                : (currentMetric.voltage_v / 1000).toFixed(2)}
            </span>
            <span className="text-xs text-slate-300 font-mono font-bold">
              {isRealSensorActive ? 'V' : 'kV'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-bold block mt-0.5 truncate">
            {isRealSensorActive
              ? `INA219: ${ina219Telemetry.current_ma.toFixed(1)} mA`
              : 'Model: 5.00V / 145.0mA'}
          </span>
        </div>
      </div>

      {/* KPI 3: System Frequency */}
      <div className="bg-[#081329] border border-blue-500/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_16px_rgba(59,130,246,0.12)] flex items-center gap-3 transition-all hover:border-blue-400">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
            SYSTEM FREQUENCY
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
              {currentMetric.frequency_hz.toFixed(2)}
            </span>
            <span className="text-xs text-slate-300 font-mono font-bold">Hz</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold block mt-0.5 truncate">
            Stable Grid
          </span>
        </div>
      </div>

      {/* KPI 4: Power Factor */}
      <div className="bg-[#081329] border border-amber-500/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_16px_rgba(245,158,11,0.12)] flex items-center gap-3 transition-all hover:border-amber-400">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
          <Gauge className="w-5 h-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
            POWER FACTOR
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
              {currentMetric.power_factor.toFixed(3)}
            </span>
            <span className="text-xs text-slate-300 font-mono font-bold">Lag</span>
          </div>
          <span className="text-[11px] text-amber-400 font-bold block mt-0.5 truncate">
            Q: {currentMetric.reactive_power_kvar.toFixed(0)} kVAR
          </span>
        </div>
      </div>

      {/* KPI 5: Active Feeders */}
      <div className="bg-[#081329] border border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_16px_rgba(16,185,129,0.12)] flex items-center gap-3 transition-all hover:border-emerald-400">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <Power className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
            ACTIVE FEEDERS
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
              {activeFeedersCount} / 5
            </span>
            <span className="text-xs text-slate-300 font-mono font-bold">Closed</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold block mt-0.5 truncate">
            {activeFeedersCount === 5 ? 'All Feeders Supplied' : `${5 - activeFeedersCount} Isolated`}
          </span>
        </div>
      </div>

      {/* KPI 6: Physical ESP32 */}
      <div className="bg-[#081329] border border-purple-500/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_16px_rgba(168,85,247,0.12)] flex items-center gap-3 transition-all hover:border-purple-400">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-purple-400" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
            PHYSICAL ESP32
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
              {hardwareDevice.status}
            </span>
          </div>
          <span className="text-[11px] text-purple-300 font-bold block mt-0.5 truncate">
            Ping: {hardwareDevice.roundtrip_latency_ms || 18} ms
          </span>
        </div>
      </div>
    </div>
  );
};
