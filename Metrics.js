import { Crosshair, Gauge, HeartPulse, Satellite } from "lucide-react";
import { motion } from "framer-motion";

function MetricCard({ icon: Icon, label, value, sub, tone = "indigo", percent = 100 }) {
  const toneMap = {
    indigo: {
      text: "text-mission-indigo",
      border: "border-mission-indigo/15",
      shadow: "shadow-[0_0_20px_rgba(99,102,241,0.1)]",
      bg: "bg-mission-indigo",
      gradient: "from-indigo-500/15 to-violet-500/5",
    },
    teal: {
      text: "text-mission-teal",
      border: "border-mission-teal/15",
      shadow: "shadow-[0_0_20px_rgba(45,212,191,0.1)]",
      bg: "bg-mission-teal",
      gradient: "from-teal-500/15 to-emerald-500/5",
    },
    green: {
      text: "text-mission-green",
      border: "border-mission-green/15",
      shadow: "shadow-[0_0_20px_rgba(52,211,153,0.1)]",
      bg: "bg-mission-green",
      gradient: "from-emerald-500/15 to-teal-500/5",
    },
    red: {
      text: "text-mission-red",
      border: "border-mission-red/20",
      shadow: "shadow-[0_0_20px_rgba(251,113,133,0.15)]",
      bg: "bg-mission-red",
      gradient: "from-rose-500/15 to-pink-500/5",
    },
    amber: {
      text: "text-mission-amber",
      border: "border-mission-amber/15",
      shadow: "shadow-[0_0_20px_rgba(251,191,36,0.1)]",
      bg: "bg-mission-amber",
      gradient: "from-amber-500/15 to-yellow-500/5",
    },
    violet: {
      text: "text-mission-violet",
      border: "border-mission-violet/15",
      shadow: "shadow-[0_0_20px_rgba(167,139,250,0.1)]",
      bg: "bg-mission-violet",
      gradient: "from-violet-500/15 to-purple-500/5",
    },
  };

  const t = toneMap[tone] || toneMap.indigo;

  return (
    <motion.div 
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`panel relative overflow-hidden min-h-[140px] px-5 py-5 ${t.border} ${t.shadow} hover:shadow-glass-md`}
    >
      {/* Gradient background wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient} rounded-2xl pointer-events-none`} />
      
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[10px] font-heading font-bold uppercase tracking-[0.25em] text-slate-400">{label}</span>
        <div className={`rounded-lg p-1.5 bg-slate-800/40 border border-slate-700/30`}>
          <Icon className={`h-5 w-5 ${t.text}`} />
        </div>
      </div>
      <div className="relative z-10 mt-4 font-heading text-4xl font-bold tracking-tight text-white drop-shadow-sm">{value}</div>
      <div className="relative z-10 mt-3 flex items-center gap-3">
        <div className="h-1 w-14 rounded-full bg-slate-700/40 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }} 
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={`h-full rounded-full ${t.bg}`} 
          />
        </div>
        <span className="text-[11px] font-medium text-slate-500">{sub}</span>
      </div>
      
      {/* Decorative corner glow */}
      <div className={`absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-3xl opacity-[0.07] ${t.bg}`} />
    </motion.div>
  );
}

export default function Metrics({ latest, status, health }) {
  const hdop = Number.isFinite(latest.hdop) ? latest.hdop.toFixed(2) : "--";
  const sats = latest.sat_count ?? "--";
  const lat = Number.isFinite(latest.lat) ? latest.lat.toFixed(5) : "--";
  const lon = Number.isFinite(latest.lon) ? latest.lon.toFixed(5) : "--";

  const hdopPercent = Number.isFinite(latest.hdop) ? Math.max(0, 100 - (latest.hdop * 10)) : 0;
  const satsPercent = typeof sats === 'number' ? Math.min(100, (sats / 12) * 100) : 0;
  const statusPercent = status === "ANOMALY" ? 100 : status === "NORMAL" ? 100 : 0;
  const healthPercent = health.backend === "ONLINE" && health.gps === "ONLINE" ? 100 : 50;

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard 
        icon={Gauge} label="HDOP" value={hdop} 
        sub="Horizontal Precision" 
        tone={latest.hdop > 2.5 ? "red" : "indigo"} 
        percent={hdopPercent}
      />
      <MetricCard 
        icon={Satellite} label="Satellites" value={sats} 
        sub="Active GNSS Sources" 
        tone={latest.sat_count < 5 ? "red" : "teal"} 
        percent={satsPercent}
      />
      <MetricCard 
        icon={Crosshair} label="Position" value={status} 
        sub={`${lat}, ${lon}`} 
        tone={status === "ANOMALY" ? "red" : "violet"} 
        percent={statusPercent}
      />
      <MetricCard 
        icon={HeartPulse} label="System" value={health.backend} 
        sub={`GPS ${health.gps} / ML ${health.ml}`} 
        tone={health.backend === "ONLINE" ? "green" : "red"} 
        percent={healthPercent}
      />
    </section>
  );
}
