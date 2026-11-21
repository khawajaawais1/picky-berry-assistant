"""Where the versioned model files live, and their version strings.

Until the team has object storage (ml/README.md), the v1 files are committed under ``ml/models``.
Each path can be overridden with an environment variable so the backend can mount them elsewhere.
"""
import os
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = Path(os.environ.get("BERRY_ML_MODELS_DIR", ML_DIR / "models"))

DETECTOR_VERSION = "berry-yolo11n-v1"
ZONE_GRID_VERSION = "zone-grid-jkl-v1"
YIELD_VERSION = "yield-baseline-v1"
SCORE_RULES_VERSION = "zone-score-rules-v1"

DETECTOR_PATH = Path(os.environ.get("BERRY_ML_DETECTOR", MODELS_DIR / "detector/v1/berry-yolo11n.onnx"))
ZONE_GRID_PATH = Path(os.environ.get("BERRY_ML_ZONE_GRID", MODELS_DIR / "zones/v1/zone_grid.csv"))
YIELD_PATH = Path(os.environ.get("BERRY_ML_YIELD", MODELS_DIR / "yield/v1/yield_model.joblib"))
