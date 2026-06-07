import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation } from "lucide-react";

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom pulsing marker icon
function createPulsingIcon(color = "#22c55e") {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 12px ${color};"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

// Component to smoothly recenter the map when coordinates change
function MapRecenter({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.setView([lat, lon], map.getZoom(), { animate: true, duration: 1.0 });
    }
  }, [lat, lon, map]);
  return null;
}

export default function GPSMap({ latest, positionHistory, status }) {
  const lat = Number.isFinite(latest?.lat) ? latest.lat : 12.9716;
  const lon = Number.isFinite(latest?.lon) ? latest.lon : 77.5946;
  const isAnomaly = status === "ANOMALY";

  // Build trail from position history
  const trail = useMemo(() => {
    if (!positionHistory || positionHistory.length === 0) return [];
    return positionHistory
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => [p.lat, p.lon]);
  }, [positionHistory]);

  const markerIcon = useMemo(
    () => createPulsingIcon(isAnomaly ? "#ef4444" : "#22c55e"),
    [isAnomaly]
  );

  return (
    <div className="panel h-full min-h-[520px] overflow-hidden p-5 shadow-glass-md flex flex-col">
      <div className="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-mission-cyan" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200">
              GPS Position Map
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Live receiver location &amp; track history
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded px-3 py-1 text-xs font-bold ${
            isAnomaly
              ? "bg-red-500/20 border border-red-500/30 text-mission-red"
              : "bg-green-500/10 border border-green-500/30 text-mission-green"
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isAnomaly ? "bg-mission-red" : "bg-mission-green"}`}></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isAnomaly ? "bg-mission-red" : "bg-mission-green"}`}></span>
            </span>
            {isAnomaly ? "ALERT" : "TRACKING"}
          </div>
        </div>
      </div>

      <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-700/50">
        <MapContainer
          center={[lat, lon]}
          zoom={15}
          scrollWheelZoom={true}
          className="h-full w-full"
          style={{ height: "100%", minHeight: "430px", background: "#0b1220" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapRecenter lat={lat} lon={lon} />

          {/* Position trail */}
          {trail.length > 1 && (
            <Polyline
              positions={trail}
              pathOptions={{
                color: isAnomaly ? "#ef4444" : "#06b6d4",
                weight: 3,
                opacity: 0.7,
                dashArray: "8 4",
              }}
            />
          )}

          {/* Accuracy circle */}
          <Circle
            center={[lat, lon]}
            radius={Number.isFinite(latest?.hdop) ? latest.hdop * 5 : 10}
            pathOptions={{
              color: isAnomaly ? "#ef4444" : "#3b82f6",
              fillColor: isAnomaly ? "#ef4444" : "#3b82f6",
              fillOpacity: 0.1,
              weight: 1,
            }}
          />

          {/* Current position marker */}
          <Marker position={[lat, lon]} icon={markerIcon}>
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#1e293b" }}>
                <strong>GPS Receiver</strong><br />
                Lat: {lat.toFixed(7)}<br />
                Lon: {lon.toFixed(7)}<br />
                HDOP: {latest?.hdop?.toFixed(2) || "--"}<br />
                Sats: {latest?.sat_count || "--"}
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Coordinate overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-600/50 bg-slate-900/85 px-4 py-2 backdrop-blur-md shadow-glass-md">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider">LAT </span>
              <span className="font-mono font-bold text-slate-200">{lat.toFixed(7)}</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider">LON </span>
              <span className="font-mono font-bold text-slate-200">{lon.toFixed(7)}</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider">HDOP </span>
              <span className="font-mono font-bold text-mission-cyan">{latest?.hdop?.toFixed(2) || "--"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
