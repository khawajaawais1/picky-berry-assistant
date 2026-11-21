# Model card — berry-yolo11n-v1

| | |
|---|---|
| Task | Detect and count berries in a forest photo: bilberry, cloudberry, crowberry, lingonberry |
| Architecture | Ultralytics YOLO11n (2.6 M parameters), exported to ONNX (input 1×3×640×640, output 1×8×8400) |
| Training data | WildBe (HF `FBK-TeV/WildBe`, CC BY-NC 4.0): 3,516 images, 18,468 boxes. Split by source image, seed 42: 2,852 train, 176 validation (official), 312 test |
| Training | Kaggle GPU T4, imgsz 640, batch 32, 89 epochs (early stopping, patience 20), 44 min, Ultralytics 8.4.209 |
| Test results (312 unseen photos) | mAP50 **0.798**, mAP50-95 0.559, precision 0.816, recall 0.754 |
| Per class mAP50 | bilberry 0.943 · cloudberry 0.911 · crowberry 0.786 · lingonberry 0.551 |
| Serving | `berry_ml.BerryDetector` (onnxruntime, CPU): letterbox 640, conf 0.25, class-aware NMS IoU 0.5; ~70 ms per photo, ~35 MB RAM |
| SHA-256 | `d100a8f8cb8e375bdd24218f1d8e2a90fe3a8f05047c4a659b0ea79a066b23ac` |
| Owner | Remon (training), Sayeem (serving) |

**Limits.** Lingonberry is weakest (small red berries under leaves). WildBe photos are close-ups; a photo taken
from standing height will find fewer berries — tell pickers to photograph a patch from about half a metre.
Counts are evidence for a zone's score, never a verified yield.
