import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Header from "./components/Header";
import Metrics from "./components/Metrics";
import Charts from "./components/Charts";
import SatelliteView from "./components/SatelliteView";
import Earth3D from "./components/Earth3D";
import GPSMap from "./components/GPSMap";
import Alerts from "./components/Alerts";
import SystemHealth from "./components/SystemHealth";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const WS_BASE = import.meta.env.VITE_WS_BASE || API_BASE.replace(/^http/, "ws");

const emptyState = {
  status: "NO_DATA",
  hdop_history: [],
  sat_count_history: [],
  signal_history: [],
  position_history: [],
  alerts: [],
  satellites: [],
  latest: null,
  system: { backend: "OFFLINE", ml: "UNKNOWN", records: 0, websocket_clients: 0 },
};

function useTelemetry() {
  const [data, setData] = useState(emptyState);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket;
    let pollTimer;
    let reconnectTimer;
    let closed = false;

    const fetchLatest = async () => {
      try {
        const response = await fetch(`${API_BASE}/latest`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setData(await response.json());
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };

    const connect = () => {
      socket = new WebSocket(`${WS_BASE}/ws`);
      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => setData(JSON.parse(event.data));
      socket.onerror = () => setConnected(false);
      socket.onclose = () => {
        setConnected(false);
        if (!closed) reconnectTimer = window.setTimeout(connect, 2500);
      };
    };

    connect();
    fetchLatest();
    pollTimer = window.setInterval(fetchLatest, 2000);

    return () => {
      closed = true;
      window.clearInterval(pollTimer);
      window.clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, []);

  return { data, connected };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function App() {
  const { data, connected } = useTelemetry();
  const latest = data.latest || {};
  const isAnomaly = data.status === "ANOMALY";

  const health = useMemo(
    () => ({
      gps: latest.gps_fix ? "ONLINE" : "DEGRADED",
      sensor: Math.abs(latest.az ?? 9.81) > 2 ? "ONLINE" : "DEGRADED",
      backend: connected ? "ONLINE" : "OFFLINE",
      ml: data.system?.ml || "UNKNOWN",
    }),
    [latest, connected, data.system],
  );

  return (
    <main className="mission-grid min-h-screen text-slate-100 overflow-x-hidden">
      <motion.div
        className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Header status={data.status} connected={connected} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Metrics latest={latest} status={data.status} health={health} />
        </motion.div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <motion.div variants={itemVariants} className="h-full">
            <Charts data={data} />
          </motion.div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-1">
            <motion.div variants={itemVariants}>
              <SystemHealth health={health} system={data.system} isAnomaly={isAnomaly} />
            </motion.div>
            <motion.div variants={itemVariants} className="h-full">
              <Alerts alerts={data.alerts} />
            </motion.div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <motion.div variants={itemVariants}>
            <GPSMap latest={latest} positionHistory={data.position_history} status={data.status} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Earth3D satellites={data.satellites} latest={latest} status={data.status} />
          </motion.div>
        </section>

        <section className="grid grid-cols-1 gap-6">
          <motion.div variants={itemVariants}>
            <SatelliteView satellites={data.satellites} latest={latest} />
          </motion.div>
        </section>
      </motion.div>
    </main>
  );
}
