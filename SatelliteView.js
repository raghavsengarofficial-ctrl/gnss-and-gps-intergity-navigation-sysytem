import { MapPin, Target } from "lucide-react";

function polarToXY(azimuth, elevation, size) {
  const radius = ((90 - elevation) / 90) * (size / 2 - 24);
  const angle = ((azimuth - 90) * Math.PI) / 180;
  return {
    x: size / 2 + radius * Math.cos(angle),
    y: size / 2 + radius * Math.sin(angle),
  };
}

export default function SatelliteView({ satellites, latest }) {
  const size = 430;
  const used = satellites.filter((s) => s.used).length;

  return (
    <div className="panel h-full p-5 shadow-glass-md flex flex-col">
      <div className="mb-5 flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-mission-cyan" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200">Sky Plot Radar</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">{used} locked / {satellites.length} visible</p>
          </div>
        </div>
        <div className="animate-pulse flex items-center gap-2 rounded bg-mission-cyan/10 border border-mission-cyan/30 px-3 py-1 text-xs font-bold text-mission-cyan">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mission-cyan opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mission-cyan"></span>
          </span>
          ACTIVE
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_200px] flex-1">
        <div className="relative mx-auto flex items-center justify-center">
          {/* Radar background container */}
          <div className="absolute inset-0 rounded-full border border-mission-cyan/20 bg-slate-900/50 shadow-[inset_0_0_40px_rgba(6,182,212,0.1)]"></div>
          
          <svg viewBox={`0 0 ${size} ${size}`} className="relative z-10 mx-auto aspect-square w-full max-w-[430px] drop-shadow-md">
            {/* Base grid circles */}
            <circle cx={size / 2} cy={size / 2} r={size / 2 - 18} fill="transparent" stroke="#1e293b" strokeWidth="2" />
            {[0.25, 0.5, 0.75].map((r) => (
              <circle key={r} cx={size / 2} cy={size / 2} r={(size / 2 - 18) * r} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            
            {/* Axis lines */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => {
              const p = polarToXY(az, 0, size);
              return <line key={az} x1={size / 2} y1={size / 2} x2={p.x} y2={p.y} stroke="#1e293b" strokeWidth={az % 90 === 0 ? 2 : 1} />;
            })}
            
            {/* Direction labels */}
            <text x={size / 2} y="14" textAnchor="middle" fill="#06b6d4" fontSize="12" fontWeight="bold" letterSpacing="1">N</text>
            <text x={size - 10} y={size / 2 + 4} textAnchor="middle" fill="#06b6d4" fontSize="12" fontWeight="bold" letterSpacing="1">E</text>
            <text x={size / 2} y={size - 6} textAnchor="middle" fill="#06b6d4" fontSize="12" fontWeight="bold" letterSpacing="1">S</text>
            <text x="10" y={size / 2 + 4} textAnchor="middle" fill="#06b6d4" fontSize="12" fontWeight="bold" letterSpacing="1">W</text>
            
            {/* Center crosshair */}
            <path d={`M ${size/2 - 5} ${size/2} L ${size/2 + 5} ${size/2} M ${size/2} ${size/2 - 5} L ${size/2} ${size/2 + 5}`} stroke="#06b6d4" strokeWidth="2" />

            {/* Satellites */}
            {satellites.map((sat) => {
              const p = polarToXY(sat.azimuth, sat.elevation, size);
              const color = sat.used ? "#22c55e" : "#64748b";
              const glowColor = sat.used ? "rgba(34,197,94,0.6)" : "rgba(100,116,139,0.3)";
              
              return (
                <g key={`${sat.constellation}-${sat.prn}`}>
                  {sat.used && (
                    <circle cx={p.x} cy={p.y} r={14} fill={glowColor} className="animate-ping" style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
                  )}
                  <circle 
                    cx={p.x} cy={p.y} r={sat.used ? 7 : 5} 
                    fill={color} 
                    stroke={sat.used ? "#fff" : "transparent"}
                    strokeWidth="1.5"
                    opacity={sat.snr < 20 ? 0.4 : 1} 
                    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                  />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{sat.prn}</text>
                </g>
              );
            })}
          </svg>
          
          {/* Radar Sweep Animation using a rotating div overlay */}
          <div className="absolute inset-4 rounded-full radar-sweep animate-radar pointer-events-none mix-blend-screen opacity-60"></div>
        </div>
        
        <div className="flex flex-col gap-4 text-sm justify-center">
          <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:bg-slate-800/60 hover:border-mission-cyan/30">
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">Latitude</div>
            <div className="mt-1 font-mono text-lg font-medium text-slate-200">{Number.isFinite(latest.lat) ? latest.lat.toFixed(7) : "---.-------"}</div>
          </div>
          <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:bg-slate-800/60 hover:border-mission-cyan/30">
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">Longitude</div>
            <div className="mt-1 font-mono text-lg font-medium text-slate-200">{Number.isFinite(latest.lon) ? latest.lon.toFixed(7) : "---.-------"}</div>
          </div>
          <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-all hover:bg-slate-800/60 hover:border-mission-cyan/30">
            <div className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">Constellations</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs font-bold text-slate-300">GPS</span>
              <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs font-bold text-slate-300">GLO</span>
              <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs font-bold text-slate-300">GAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
