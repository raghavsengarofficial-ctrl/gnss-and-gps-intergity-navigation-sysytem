from __future__ import annotations

import csv
import math
import time
from collections import deque
from pathlib import Path
from threading import RLock
from typing import Any, Deque, Dict, List, Optional

import joblib
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from train_model import FEATURE_NAMES, MODEL_PATH, train_and_save
except ModuleNotFoundError:
    from .train_model import FEATURE_NAMES, MODEL_PATH, train_and_save


app = FastAPI(title="GPS Integrity Monitoring API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Satellite(BaseModel):
    prn: int
    azimuth: float = Field(ge=0, le=360)
    elevation: float = Field(ge=0, le=90)
    snr: float = Field(ge=0, le=99)
    used: bool = False
    constellation: str = "GPS"


class Telemetry(BaseModel):
    device_id: str = "unknown"
    timestamp_ms: Optional[int] = None
    lat: float
    lon: float
    hdop: float
    sat_count: int
    gps_fix: bool = True
    simulation: bool = False
    ax: float = 0.0
    ay: float = 0.0
    az: float = 9.81
    gx: float = 0.0
    gy: float = 0.0
    gz: float = 0.0
    satellites: List[Satellite] = Field(default_factory=list)


history: Deque[Dict[str, Any]] = deque(maxlen=100)
alerts: Deque[Dict[str, Any]] = deque(maxlen=50)
clients: List[WebSocket] = []
state_lock = RLock()
model_payload: Dict[str, Any] = {}


def load_model() -> Dict[str, Any]:
    if not MODEL_PATH.exists():
        train_and_save(MODEL_PATH)
    payload = joblib.load(MODEL_PATH)
    if "pipeline" not in payload:
        raise RuntimeError("model.pkl is invalid: missing pipeline")
    return payload


def feature_vector(sample: Telemetry) -> np.ndarray:
    values = [getattr(sample, name) for name in FEATURE_NAMES]
    sanitized = [0.0 if not math.isfinite(float(v)) else float(v) for v in values]
    return np.array([sanitized], dtype=float)


def classify(sample: Telemetry) -> Dict[str, Any]:
    x = feature_vector(sample)
    pipeline = model_payload["pipeline"]
    prediction = int(pipeline.predict(x)[0])
    score = float(pipeline.decision_function(x)[0])
    confidence = float(np.clip(abs(score) / 0.18, 0.02, 0.99))

    rule_reasons = []
    if not sample.gps_fix:
        rule_reasons.append("GPS_FIX_LOST")
    if sample.hdop >= 3.0:
        rule_reasons.append("HDOP_SPIKE")
    if sample.sat_count <= 4:
        rule_reasons.append("SATELLITE_DROP")
    if max(abs(sample.gx), abs(sample.gy), abs(sample.gz)) > 1.6:
        rule_reasons.append("MOTION_INCONSISTENCY")

    status = "ANOMALY" if prediction == -1 or rule_reasons else "NORMAL"
    if rule_reasons:
        confidence = max(confidence, 0.82)

    return {
        "status": status,
        "confidence": round(confidence, 4),
        "score": round(score, 6),
        "reasons": rule_reasons or ["ML_BASELINE"],
    }


def synthetic_satellites() -> List[Dict[str, Any]]:
    now = time.time()
    sats = []
    constellations = ["GPS", "GLONASS", "Galileo"]
    for i in range(18):
        sats.append(
            {
                "prn": i + 1,
                "azimuth": (i * 23 + now * 5) % 360,
                "elevation": 12 + ((i * 17) % 76),
                "snr": 25 + ((i * 9) % 23),
                "used": i < 10,
                "constellation": constellations[i % len(constellations)],
            }
        )
    return sats


def latest_payload() -> Dict[str, Any]:
    with state_lock:
        records = list(history)
        latest = records[-1] if records else None
        current_alerts = list(alerts)

    latest_satellites = latest.get("satellites", []) if latest else synthetic_satellites()
    status = latest["status"] if latest else "NO_DATA"
    return {
        "status": status,
        "hdop_history": [r["hdop"] for r in records],
        "sat_count_history": [r["sat_count"] for r in records],
        "signal_history": [r["signal_strength"] for r in records],
        "position_history": [{"lat": r["lat"], "lon": r["lon"], "t": r["received_at"]} for r in records],
        "alerts": current_alerts,
        "satellites": latest_satellites,
        "latest": latest,
        "system": {
            "backend": "ONLINE",
            "ml": "ONLINE",
            "records": len(records),
            "websocket_clients": len(clients),
            "model_version": model_payload.get("version", "unknown"),
        },
    }


async def broadcast(payload: Dict[str, Any]) -> None:
    disconnected = []
    for client in clients:
        try:
            await client.send_json(payload)
        except Exception:
            disconnected.append(client)
    for client in disconnected:
        if client in clients:
            clients.remove(client)


@app.on_event("startup")
def startup() -> None:
    global model_payload
    model_payload = load_model()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ONLINE", "ml": "ONLINE" if model_payload else "LOADING"}


@app.post("/data")
async def ingest(sample: Telemetry) -> Dict[str, Any]:
    decision = classify(sample)
    now = time.time()
    satellites = [s.model_dump() for s in sample.satellites] or synthetic_satellites()
    used_snr = [float(s["snr"]) for s in satellites if s.get("used")]
    signal_strength = round(float(np.mean(used_snr)) if used_snr else 0.0, 2)

    record = sample.model_dump()
    record.update(decision)
    record["received_at"] = now
    record["signal_strength"] = signal_strength
    record["satellites"] = satellites

    with state_lock:
        history.append(record)
        if decision["status"] == "ANOMALY":
            alerts.appendleft(
                {
                    "time": now,
                    "device_id": sample.device_id,
                    "message": ", ".join(decision["reasons"]),
                    "confidence": decision["confidence"],
                    "lat": sample.lat,
                    "lon": sample.lon,
                }
            )
        payload = latest_payload()

    await broadcast(payload)
    return {"status": decision["status"], "confidence": decision["confidence"]}


@app.get("/latest")
def latest() -> Dict[str, Any]:
    return latest_payload()


@app.get("/alerts/export")
def export_alerts() -> Dict[str, str]:
    export_path = Path(__file__).with_name("anomaly_log.csv")
    with state_lock:
        rows = list(alerts)

    with export_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["time", "device_id", "message", "confidence", "lat", "lon"])
        writer.writeheader()
        writer.writerows(rows)
    return {"path": str(export_path)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    clients.append(websocket)
    try:
        await websocket.send_json(latest_payload())
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in clients:
            clients.remove(websocket)
