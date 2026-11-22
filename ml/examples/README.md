# Example photos (used by the tests and the live check)

Three photos from the WildBe **test** split (never seen in training), saved as JPEG like the app sends.
Each `.txt` is the photo's true label in YOLO format: `class cx cy w h` (0-1 of the image size;
classes 0 bilberry, 1 cloudberry, 2 crowberry, 3 lingonberry).

| Photo | WildBe file | True berries | Detector v1 finds (confidence) |
|---|---|---|---|
| test_1.jpg | wildbe_00026 | 1 cloudberry | cloudberry 0.80 (the true one) + cloudberry 0.34 (false positive) |
| test_2.jpg | wildbe_00027 | 1 cloudberry | cloudberry 0.37 at another spot (false positive); the true cloudberry only scores 0.15, so it is **missed** at the default 0.25 threshold |
| test_3.jpg | wildbe_00028 | 1 cloudberry | cloudberry 0.83 + crowberry 0.35 (false positive) |

Until 2026-11-22 these files were the detector's *output* images (boxes and labels drawn on them), so
the detector was tested on photos with drawn boxes, which made it report bilberries that are not there.

Our ONNX detector gives the same boxes and classes as Ultralytics; confidences differ by up to about 0.01
because the photo is resized with PIL instead of OpenCV (`tests/test_detector.py::test_matches_ultralytics`).
