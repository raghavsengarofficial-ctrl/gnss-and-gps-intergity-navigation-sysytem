from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FEATURE_NAMES = ["hdop", "sat_count", "lat", "lon", "ax", "ay", "az", "gx", "gy", "gz"]
MODEL_PATH = Path(__file__).with_name("model.pkl")


@dataclass(frozen=True)
class TrainingConfig:
    seed: int = 42
    normal_samples: int = 7000
    anomaly_samples: int = 1600
    contamination: float = 0.08


def _normal_motion(rng: np.random.Generator, n: int) -> np.ndarray:
    ax = rng.normal(0.0, 0.16, n)
    ay = rng.normal(0.0, 0.16, n)
    az = rng.normal(9.81, 0.22, n)
    gx = rng.normal(0.0, 0.025, n)
    gy = rng.normal(0.0, 0.025, n)
    gz = rng.normal(0.0, 0.025, n)
    return np.column_stack([ax, ay, az, gx, gy, gz])


def generate_dataset(config: TrainingConfig = TrainingConfig()) -> Tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(config.seed)

    n = config.normal_samples
    base_lat = 12.9716
    base_lon = 77.5946
    normal_hdop = np.clip(rng.normal(0.95, 0.22, n), 0.55, 1.8)
    normal_sat = np.clip(np.rint(rng.normal(12.5, 2.1, n)), 7, 20)
    normal_lat = base_lat + rng.normal(0.0, 0.00012, n)
    normal_lon = base_lon + rng.normal(0.0, 0.00012, n)
    normal = np.column_stack([normal_hdop, normal_sat, normal_lat, normal_lon, _normal_motion(rng, n)])

    a = config.anomaly_samples
    anomaly = normal[rng.integers(0, n, size=a)].copy()
    modes = rng.integers(0, 5, size=a)

    hdop_spikes = modes == 0
    anomaly[hdop_spikes, 0] = rng.uniform(3.0, 12.0, hdop_spikes.sum())

    satellite_drops = modes == 1
    anomaly[satellite_drops, 1] = rng.integers(0, 5, satellite_drops.sum())

    position_jumps = modes == 2
    anomaly[position_jumps, 2] += rng.normal(0.015, 0.007, position_jumps.sum())
    anomaly[position_jumps, 3] += rng.normal(-0.018, 0.008, position_jumps.sum())

    sensor_mismatch = modes == 3
    anomaly[sensor_mismatch, 4] = rng.normal(3.5, 1.4, sensor_mismatch.sum())
    anomaly[sensor_mismatch, 5] = rng.normal(-2.8, 1.1, sensor_mismatch.sum())
    anomaly[sensor_mismatch, 6] = rng.normal(5.0, 1.5, sensor_mismatch.sum())
    anomaly[sensor_mismatch, 7:10] = rng.normal(0.9, 0.35, (sensor_mismatch.sum(), 3))

    spoof_like = modes == 4
    anomaly[spoof_like, 0] = rng.uniform(0.45, 0.85, spoof_like.sum())
    anomaly[spoof_like, 1] = rng.integers(18, 31, spoof_like.sum())
    anomaly[spoof_like, 2] += rng.normal(0.004, 0.0015, spoof_like.sum())
    anomaly[spoof_like, 3] += rng.normal(0.004, 0.0015, spoof_like.sum())

    x = np.vstack([normal, anomaly])
    y = np.hstack([np.zeros(n, dtype=int), np.ones(a, dtype=int)])
    order = rng.permutation(len(x))
    return x[order], y[order]


def train_and_save(output: Path = MODEL_PATH, config: TrainingConfig = TrainingConfig()) -> Pipeline:
    x, _ = generate_dataset(config)
    pipeline = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "model",
                IsolationForest(
                    n_estimators=240,
                    max_samples="auto",
                    contamination=config.contamination,
                    random_state=config.seed,
                    n_jobs=1,
                ),
            ),
        ]
    )
    pipeline.fit(x)
    payload = {
        "pipeline": pipeline,
        "feature_names": FEATURE_NAMES,
        "normal_score_floor": -0.18,
        "version": "1.0.0",
    }
    joblib.dump(payload, output)
    return pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Train GPS integrity Isolation Forest model.")
    parser.add_argument("--output", type=Path, default=MODEL_PATH)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    train_and_save(args.output, TrainingConfig(seed=args.seed))
    print(f"Model saved to {args.output}")


if __name__ == "__main__":
    main()
