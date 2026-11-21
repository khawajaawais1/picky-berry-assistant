"""Where the versioned model files live, and their version strings.

Until the team has object storage (ml/README.md), the v1 files are committed under ``ml/models``.
Each path can be overridden with an environment variable so the backend can mount them elsewhere.
"""
import os
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = Path(os.environ.get("BERRY_ML_MODELS_DIR", ML_DIR / "models"))

DETECTOR_VERSION = "berry-yolo11n-v1"
YIELD_VERSION = "yield-baseline-v1"
SCORE_RULES_VERSION = "zone-score-rules-v2"

DETECTOR_PATH = Path(os.environ.get("BERRY_ML_DETECTOR", MODELS_DIR / "detector/v1/berry-yolo11n.onnx"))
# v2 = 60 x 60 km pilot area (zones/build_zone_grid.py, HALF_M = 30000); v1 = the first 40 x 40 km grid.
_GRIDS = {"zone-grid-jkl60-v2": MODELS_DIR / "zones/v2/zone_grid.csv",
          "zone-grid-jkl-v1": MODELS_DIR / "zones/v1/zone_grid.csv"}
if "BERRY_ML_ZONE_GRID" in os.environ:
    ZONE_GRID_PATH = Path(os.environ["BERRY_ML_ZONE_GRID"])
    ZONE_GRID_VERSION = os.environ.get("BERRY_ML_ZONE_GRID_VERSION", "zone-grid-custom")
else:
    ZONE_GRID_VERSION, ZONE_GRID_PATH = next((v, p) for v, p in _GRIDS.items() if p.exists())
YIELD_PATH = Path(os.environ.get("BERRY_ML_YIELD", MODELS_DIR / "yield/v1/yield_model.joblib"))
