import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function chartRows(data) {
  const n = Math.max(data.hdop_history.length, data.sat_count_history.length, data.signal_history.length);
  return Array.from({ length: n }, (_, i) => ({
    index: i + 1,
    hdop: data.hdop_history[i],
    satellites: data.sat_count_history[i],
    signal: data.signal_history[i],
    consistency: data.position_history?.[i]
      ? Math.max(0, 100 - Math.abs((data.hdop_history[i] ?? 1) - 1) * 28)
      : 0,
  }));
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-600/30 bg-slate-900/85 p-3 shadow-glass-md backdrop-blur-xl">
        <p className="mb-2 border-b border-slate-700/50 pb-1 text-[10px] font-heading font-bold text-slate-400 uppercase tracking-[0.2em]">
          T-{Math.abs(payload[0].payload.index - 60)}s
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-slate-300">{entry.name}:</span>
            <span className="text-xs font-mono font-bold" style={{ color: entry.color }}>
              {Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function PanelChart({ title, children }) {
  return (
    <div className="panel h-72 p-5 shadow-glass-sm flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[10px] font-heading font-bold uppercase tracking-[0.25em] text-slate-400">{title}</h2>
        <div className="flex gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-mission-indigo/30"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-mission-violet/30"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-mission-teal/30"></div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        {children}
      </div>
    </div>
  );
}

export default function Charts({ data }) {
  const rows = chartRows(data);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 h-full">
      <PanelChart title="HDOP Variance">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHdop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#6366f1" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(99,102,241,0.06)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="index" stroke="#334155" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <YAxis stroke="#334155" domain={[0, "dataMax + 1"]} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" name="HDOP" dataKey="hdop" stroke="#818cf8" strokeWidth={2.5} fill="url(#colorHdop)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </PanelChart>
      
      <PanelChart title="Visible Satellites">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSats" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#2dd4bf" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(45,212,191,0.06)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="index" stroke="#334155" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <YAxis stroke="#334155" domain={[0, "dataMax + 3"]} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="step" name="Satellites" dataKey="satellites" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#colorSats)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </PanelChart>
      
      <PanelChart title="Signal Strength (SNR)">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSignal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(251,191,36,0.06)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="index" stroke="#334155" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <YAxis stroke="#334155" domain={[0, 60]} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" name="SNR" dataKey="signal" stroke="#fbbf24" strokeWidth={2.5} fill="url(#colorSignal)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </PanelChart>
      
      <PanelChart title="Position Consistency">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(167,139,250,0.06)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="index" stroke="#334155" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <YAxis stroke="#334155" domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" name="Consistency" dataKey="consistency" stroke="#a78bfa" strokeWidth={2.5} dot={false} isAnimationActive={false} style={{ filter: 'drop-shadow(0px 0px 6px rgba(167,139,250,0.4))' }} />
          </LineChart>
        </ResponsiveContainer>
      </PanelChart>
    </div>
  );
}
