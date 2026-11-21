"""Berry detector: photo -> berries, counts and boxes (feature 6.4 / 6.5).

Runs the exported YOLO11n ONNX model with onnxruntime only (no Ultralytics/PyTorch at serving
time), so the backend image stays small and the AGPL training library is not a runtime dependency.
Pre- and post-processing match Ultralytics' defaults (letterbox to 640, conf 0.25, class-aware
NMS at IoU 0.5, the Ultralytics 8.4 default), and ``tests/test_detector.py`` checks the counts against the training library.

    from berry_ml import BerryDetector
    detector = BerryDetector()                       # load once at startup (~0.2 s)
    result = detector.detect(photo_bytes)            # bytes, path, PIL image or HxWx3 uint8 array
    result.counts      -> {"bilberry": 32, "cloudberry": 0, "crowberry": 0, "lingonberry": 0}
    result.to_dict()   -> camelCase JSON for the API
"""
from __future__ import annotations

import io
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from .paths import DETECTOR_PATH, DETECTOR_VERSION

CLASSES = ("bilberry", "cloudberry", "crowberry", "lingonberry")
ImageInput = bytes | bytearray | str | Path | Image.Image | np.ndarray

#: Largest photo the detector accepts (pixels per side) before it refuses: guards the server
#: against decompression bombs. Phone photos are ~4000 px, so 12000 leaves plenty of room.
MAX_SIDE = 12000


class InvalidImageError(ValueError):
    """The input could not be read as an image (maps to HTTP 400 / problem+json)."""


@dataclass
class Detection:
    berry: str
    confidence: float
    box: list[float]  # [x1, y1, x2, y2] in original image pixels

    def to_dict(self) -> dict:
        return {"berry": self.berry, "confidence": self.confidence, "box": self.box}


@dataclass
class DetectionResult:
    detections: list[Detection]
    counts: dict[str, int]
    total: int
    image_size: tuple[int, int]  # (width, height)
    model_version: str = DETECTOR_VERSION
    thresholds: dict = field(default_factory=dict)

    def to_dict(self, include_boxes: bool = True) -> dict:
        out = {
            "counts": self.counts,
            "total": self.total,
            "imageSize": {"width": self.image_size[0], "height": self.image_size[1]},
            "modelVersion": self.model_version,
        }
        if include_boxes:
            out["detections"] = [d.to_dict() for d in self.detections]
        return out


def _to_rgb(image: ImageInput) -> Image.Image:
    try:
        if isinstance(image, (bytes, bytearray)):
            img = Image.open(io.BytesIO(image))
        elif isinstance(image, (str, Path)):
            img = Image.open(image)
        elif isinstance(image, np.ndarray):
            img = Image.fromarray(image.astype(np.uint8))
        elif isinstance(image, Image.Image):
            img = image
        else:
            raise InvalidImageError(f"unsupported image type: {type(image).__name__}")
        if max(img.size) > MAX_SIDE:
            raise InvalidImageError(f"image larger than {MAX_SIDE}px on a side")
        img = ImageOps.exif_transpose(img)  # phone photos carry their rotation in EXIF
        return img.convert("RGB")
    except InvalidImageError:
        raise
    except Exception as exc:  # PIL raises many types for broken files
        raise InvalidImageError("the file is not a readable image") from exc


def _letterbox(img: Image.Image, size: int):
    w, h = img.size
    r = min(size / w, size / h)
    nw, nh = round(w * r), round(h * r)
    resized = img.resize((nw, nh), Image.BILINEAR)
    canvas = Image.new("RGB", (size, size), (114, 114, 114))
    dx, dy = (size - nw) / 2, (size - nh) / 2
    canvas.paste(resized, (round(dx - 0.1), round(dy - 0.1)))
    return canvas, r, (round(dx - 0.1), round(dy - 0.1))


def _nms(boxes: np.ndarray, scores: np.ndarray, iou: float) -> list[int]:
    order = scores.argsort()[::-1]
    keep = []
    x1, y1, x2, y2 = boxes.T
    areas = (x2 - x1).clip(0) * (y2 - y1).clip(0)
    while order.size:
        i = order[0]
        keep.append(int(i))
        xx1 = np.maximum(x1[i], x1[order[1:]]); yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]]); yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = (xx2 - xx1).clip(0) * (yy2 - yy1).clip(0)
        ov = inter / (areas[i] + areas[order[1:]] - inter + 1e-9)
        order = order[1:][ov <= iou]
    return keep


class BerryDetector:
    def __init__(self, model_path: str | Path = DETECTOR_PATH, conf: float = 0.25,
                 iou: float = 0.5, imgsz: int = 640, max_det: int = 300, threads: int = 0):
        opts = ort.SessionOptions()
        if threads:
            opts.intra_op_num_threads = threads
        self.session = ort.InferenceSession(str(model_path), sess_options=opts,
                                            providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.conf, self.iou, self.imgsz, self.max_det = conf, iou, imgsz, max_det

    def detect(self, image: ImageInput, conf: float | None = None) -> DetectionResult:
        conf = self.conf if conf is None else conf
        img = _to_rgb(image)
        w0, h0 = img.size
        boxed, r, (px, py) = _letterbox(img, self.imgsz)
        x = np.asarray(boxed, dtype=np.float32).transpose(2, 0, 1)[None] / 255.0
        pred = self.session.run(None, {self.input_name: x})[0][0].T  # (8400, 4 + classes)
        cls_scores = pred[:, 4:]
        cls_ids = cls_scores.argmax(1)
        scores = cls_scores.max(1)
        m = scores > conf
        pred, cls_ids, scores = pred[m], cls_ids[m], scores[m]
        dets: list[Detection] = []
        if len(scores):
            cx, cy, bw, bh = pred[:, 0], pred[:, 1], pred[:, 2], pred[:, 3]
            boxes = np.stack([cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2], 1)
            offset = cls_ids[:, None] * 7680.0  # class-aware NMS, as Ultralytics does
            keep = _nms(boxes + offset, scores, self.iou)[: self.max_det]
            boxes = boxes[keep]
            boxes[:, [0, 2]] = ((boxes[:, [0, 2]] - px) / r).clip(0, w0)
            boxes[:, [1, 3]] = ((boxes[:, [1, 3]] - py) / r).clip(0, h0)
            for b, c, s in zip(boxes, cls_ids[keep], scores[keep]):
                dets.append(Detection(CLASSES[int(c)], round(float(s), 3), [round(float(v), 1) for v in b]))
        counts = {name: 0 for name in CLASSES}
        for d in dets:
            counts[d.berry] += 1
        return DetectionResult(dets, counts, len(dets), (w0, h0), DETECTOR_VERSION,
                               {"confidence": conf, "iou": self.iou})
