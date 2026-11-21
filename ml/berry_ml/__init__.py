"""berry_ml - the Berry Picker Assistant's ML, packaged for the backend.

    from berry_ml import BerryDetector, ZoneGrid, YieldModel, Report, update_zone_score, update_trust

Dependencies: numpy, pandas, pillow, onnxruntime, joblib (see ml/requirements.txt).
"""
from .detector import CLASSES, BerryDetector, DetectionResult, InvalidImageError
from .paths import DETECTOR_VERSION, SCORE_RULES_VERSION, YIELD_VERSION, ZONE_GRID_VERSION
from .reports import Report, update_trust, update_zone_score
from .yield_model import YieldModel
from .zones import SPECIES, ZoneGrid, ZoneScore, day_of_year, ripeness, ripening_window, today_helsinki

__all__ = ["BerryDetector", "DetectionResult", "InvalidImageError", "CLASSES", "ZoneGrid", "ZoneScore",
           "YieldModel", "Report", "update_zone_score", "update_trust", "ripeness", "day_of_year",
           "ripening_window", "today_helsinki", "SPECIES",
           "DETECTOR_VERSION", "ZONE_GRID_VERSION", "YIELD_VERSION", "SCORE_RULES_VERSION"]
