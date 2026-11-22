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
    assert r.counts["cloudberry"] >= 1


def _truth(name):
    """WildBe ground truth for an example photo: [(class, x1, y1, x2, y2)] in pixels."""
    w, h = 528, 396
    out = []
    for line in (EX / name).with_suffix(".txt").read_text().split("\n"):
        if line.strip():
            c, cx, cy, bw, bh = line.split()
            cx, cy, bw, bh = float(cx) * w, float(cy) * h, float(bw) * w, float(bh) * h
            out.append((CLASSES[int(c)], cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2))
    return out


def _iou(a, b):
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter)


@pytest.mark.parametrize(("name", "conf"), [("test_1.jpg", 0.25), ("test_3.jpg", 0.25),
                                          ("test_2.jpg", 0.10)])  # test_2's berry only scores 0.15: a known miss at 0.25
def test_finds_every_labelled_berry_in_the_clean_example_photos(det, name, conf):
    found = det.detect(EX / name, conf=conf).detections
    for berry, *box in _truth(name):
        assert any(d.berry == berry and _iou(d.box, box) >= 0.5 for d in found), f"{name}: missed the {berry}"


def test_boxes_are_inside_the_image(det):
    r = det.detect((EX / "test_1.jpg").read_bytes())
    w, h = r.image_size
    for d in r.detections:
        x1, y1, x2, y2 = d.box
        assert 0 <= x1 < x2 <= w and 0 <= y1 < y2 <= h
        assert 0.25 <= d.confidence <= 1


def test_payload_is_snake_case(det):
    p = det.detect(EX / "test_2.jpg").to_dict()
    assert {"counts", "total", "image_size", "model_version", "detections"} <= set(p)
    assert "detections" not in det.detect(EX / "test_2.jpg").to_dict(include_boxes=False)


def test_blank_image_finds_nothing(det):
    assert det.detect(np.full((480, 640, 3), 127, np.uint8)).total == 0


def test_garbage_is_refused(det):
    with pytest.raises(InvalidImageError):
        det.detect(b"not an image")


def test_matches_ultralytics(det):
    """Same boxes and classes as Ultralytics; confidences within 0.02 (PIL vs OpenCV resizing), so a detection
    may only differ when its confidence is within 0.02 of the threshold."""
    yolo = pytest.importorskip("ultralytics").YOLO
    model = yolo(str(Path(__file__).resolve().parents[1] / "models/detector/v1/berry-yolo11n.onnx"), task="detect")
    tol = 0.02
    for f in sorted(EX.glob("test_*.jpg")):
        for conf in (0.25, 0.1):
            ours = [(d.berry, d.confidence, d.box) for d in det.detect(f, conf=conf - tol).detections]
            r = model.predict(str(f), conf=conf - tol, imgsz=640, verbose=False)[0]
            bx = r.boxes
            theirs = [(r.names[int(c)], float(s), [float(v) for v in b]) for c, s, b in zip(bx.cls, bx.conf, bx.xyxy)]
            for a_list, b_list in ((ours, theirs), (theirs, ours)):
                for berry, sc, box in a_list:
                    match = [x for x in b_list if x[0] == berry and _iou(x[2], box) >= 0.9 and abs(x[1] - sc) <= tol]
                    assert match or sc < conf + tol, (f.name, conf, berry, round(sc, 3))
