from pathlib import Path

import numpy as np
import pytest

from berry_ml import CLASSES, BerryDetector, InvalidImageError

EX = Path(__file__).resolve().parents[1] / "examples"


@pytest.fixture(scope="module")
def det():
    return BerryDetector()


def test_counts_have_every_class_and_add_up(det):
    r = det.detect(EX / "test_1.jpg")
    assert set(r.counts) == set(CLASSES)
    assert sum(r.counts.values()) == r.total == len(r.detections)
    assert r.counts["bilberry"] >= 1


def test_boxes_are_inside_the_image(det):
    r = det.detect((EX / "test_1.jpg").read_bytes())
    w, h = r.image_size
    for d in r.detections:
        x1, y1, x2, y2 = d.box
        assert 0 <= x1 < x2 <= w and 0 <= y1 < y2 <= h
        assert 0.25 <= d.confidence <= 1


def test_payload_is_camel_case(det):
    p = det.detect(EX / "test_2.jpg").to_dict()
    assert {"counts", "total", "imageSize", "modelVersion", "detections"} <= set(p)
    assert "detections" not in det.detect(EX / "test_2.jpg").to_dict(include_boxes=False)


def test_blank_image_finds_nothing(det):
    assert det.detect(np.full((480, 640, 3), 127, np.uint8)).total == 0


def test_garbage_is_refused(det):
    with pytest.raises(InvalidImageError):
        det.detect(b"not an image")


def test_matches_ultralytics_counts(det):
    yolo = pytest.importorskip("ultralytics").YOLO
    model = yolo(str(Path(__file__).resolve().parents[1] / "models/detector/v1/berry-yolo11n.onnx"), task="detect")
    for f in sorted(EX.glob("test_*.jpg")):
        for conf in (0.25, 0.1):
            ours = det.detect(f, conf=conf).total
            theirs = len(model.predict(str(f), conf=conf, imgsz=640, verbose=False)[0].boxes)
            assert ours == theirs, (f.name, conf)
