import { Cpu, Database, Radar, Server, Zap } from "lucide-react";
import { motion } from "framer-motion";

function Row({ icon: Icon, label, value }) {
  const online = value === "ONLINE";
  return (
    <div className="group flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/20 p-3.5 transition-all hover:bg-slate-800/40 hover:border-slate-600">
      <div className="flex items-center gap-3">
        <div className={`rounded-md p-1.5 ${online ? "bg-mission-green/10" : "bg-mission-amber/10"}`}>
          <Icon className={`h-4 w-4 ${online ? "text-mission-green" : "text-mission-amber"}`} />
        </div>
        <span className="text-sm font-medium text-slate-300 group-hover:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {online && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mission-green opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mission-green"></span>
          </span>
        )}
        <span className={`text-sm font-bold tracking-widest ${online ? "text-mission-green drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]" : "text-mission-amber"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function SystemHealth({ health, system, isAnomaly }) {
  return (
    <div className={`panel relative overflow-hidden h-full p-5 shadow-glass-md transition-colors duration-500 ${isAnomaly ? "border-mission-red/40 shadow-danger" : ""}`}>
      {/* Background glow based on status */}
      <div className={`absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-10 ${isAnomaly ? "bg-mission-red" : "bg-mission-blue"}`} />
      
      <div className="mb-5 flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-mission-blue" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200">System Health</h2>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-slate-400">TELEMETRY</span>
          <span className="font-mono text-xs text-mission-cyan">{system?.records || 0} PKTS</span>
        </div>
      </div>
      
      <div className="space-y-3 relative z-10">
        <Row icon={Radar} label="GPS Receiver Base" value={health.gps} />
        <Row icon={Cpu} label="Inertial Measurement" value={health.sensor} />
        <Row icon={Server} label="Data Acquisition API" value={health.backend} />
        <Row icon={Database} label="Isolation Forest ML" value={health.ml} />
      </div>
    </div>
  );
}
