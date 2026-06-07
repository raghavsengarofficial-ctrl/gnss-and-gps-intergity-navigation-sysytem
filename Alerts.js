import { Bell, Download, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Alerts({ alerts }) {
  return (
    <div className="panel h-full flex flex-col p-5 shadow-glass-md">
      <div className="mb-5 flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-mission-red" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200">System Alerts</h2>
        </div>
        <a
          href="http://localhost:8000/alerts/export"
          className="group flex items-center gap-2 rounded bg-slate-800/50 border border-slate-600/50 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:bg-mission-blue/20 hover:border-mission-blue/50 hover:text-white shadow-glass-sm"
          title="Export anomaly log"
        >
          <Download className="h-3.5 w-3.5 group-hover:animate-bounce" />
          <span>EXPORT</span>
        </a>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {alerts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex h-32 flex-col items-center justify-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 text-sm text-slate-400"
          >
            <div className="rounded-full bg-green-500/10 p-3">
              <Bell className="h-5 w-5 text-mission-green" />
            </div>
            <span>No active integrity alerts</span>
          </motion.div>
        ) : (
          <AnimatePresence>
            {alerts.slice(0, 8).map((alert, idx) => (
              <motion.div 
                key={`${alert.time}-${alert.message}`} 
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative overflow-hidden rounded-lg border border-red-500/30 bg-red-950/20 p-3 shadow-danger backdrop-blur-sm transition-all hover:bg-red-900/30 hover:border-red-500/50"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-mission-red to-rose-600" />
                <div className="pl-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold tracking-wide text-mission-red drop-shadow-sm group-hover:text-red-400">{alert.message}</span>
                    <span className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-300">
                      CONF: {Math.round(alert.confidence * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">{new Date(alert.time * 1000).toLocaleTimeString()}</span>
                    <span>SOURCE: ISOLATION_FOREST</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
