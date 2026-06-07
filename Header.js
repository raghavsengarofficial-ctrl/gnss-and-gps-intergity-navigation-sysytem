import { Activity, RadioTower, ShieldAlert, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Header({ status, connected }) {
  const anomaly = status === "ANOMALY";
  return (
    <header className="panel relative overflow-hidden px-6 py-5 shadow-glass-md">
      <div className="scanline" />
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-mission-indigo/30 rounded-tl-2xl pointer-events-none" />
      <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-mission-indigo/30 rounded-tr-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-mission-indigo/20 to-mission-violet/10 border border-mission-indigo/25 shadow-glow">
              <RadioTower className="h-6 w-6 text-mission-indigo animate-pulseGlow" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                GPS Integrity Monitor
              </h1>
              <p className="text-xs font-heading font-medium tracking-[0.25em] text-mission-violet/70 uppercase mt-0.5">
                Mission Control Interface
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Live clock feel */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 tracking-wider">
            <div className="h-1 w-1 rounded-full bg-mission-violet/50 animate-blink"></div>
            SYS ACTIVE
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-700/40 bg-slate-800/30 px-4 py-2 backdrop-blur-sm shadow-glass-sm">
            <Activity className={connected ? "h-4 w-4 text-mission-teal" : "h-4 w-4 text-mission-red"} />
            <span className="text-xs font-heading font-bold tracking-[0.15em] text-slate-300">
              {connected ? "LINK ONLINE" : "LINK OFFLINE"}
            </span>
          </div>

          <motion.div
            animate={anomaly ? {
              scale: [1, 1.04, 1],
              boxShadow: [
                "0 0 8px rgba(251, 113, 133, 0)",
                "0 0 28px rgba(251, 113, 133, 0.35)",
                "0 0 8px rgba(251, 113, 133, 0)",
              ],
            } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
            className={`flex items-center gap-3 rounded-xl border px-5 py-2.5 backdrop-blur-md ${
              anomaly
                ? "border-mission-red/50 bg-rose-500/15 shadow-danger text-mission-red"
                : "border-mission-teal/25 bg-emerald-500/8 shadow-glass-sm text-mission-teal"
            }`}
          >
            {anomaly ? (
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            <span className="text-sm font-heading font-bold tracking-[0.2em] uppercase">
              {status}
            </span>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
