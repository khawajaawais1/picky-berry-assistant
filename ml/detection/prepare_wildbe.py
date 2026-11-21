"""
prepare_wildbe.py  -  Team Picky / Berry Picker Assistant (ML team)

Turns the WildBe .parquet files into the folder layout YOLO needs:

  ML/data/wildbe_yolo/
      images/train  images/val  images/test
      labels/train  labels/val  labels/test
      data.yaml

- train.parquet      -> split into train (90%) and test (10%)
                        (split by source image, so crops of the same photo
                         never end up in both train and test)
- validation.parquet -> val

Run from:  C:\\Users\\Sayeem09\\Downloads\\TIES4570_CSDP_Sayeem
Command :  python ML\\prepare_wildbe.py
"""
import json
import random
import sys
from collections import Counter
from pathlib import Path

import pyarrow.parquet as pq

CLASSES = {0: "bilberry", 1: "cloudberry", 2: "crowberry", 3: "lingonberry"}
TEST_SHARE = 0.10
SEED = 42

src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("ML/data/wildbe/data")
out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("ML/data/wildbe_yolo")


def write_example(row, split, counts, boxes):
    name = f"wildbe_{int(row['index']):05d}"
    img = row["image"]["bytes"]
    ext = ".png" if img[:4] == b"\x89PNG" else ".jpg"
    (out / "images" / split / f"{name}{ext}").write_bytes(img)
    lines = []
    for lab in json.loads(row["labels"] or "[]"):
        c = int(lab["class"])
        lines.append(f"{c} {lab['x']:.6f} {lab['y']:.6f} {lab['width']:.6f} {lab['height']:.6f}")
        boxes[split][CLASSES[c]] += 1
    (out / "labels" / split / f"{name}.txt").write_text("\n".join(lines))
    counts[split] += 1


def main():
    for part in ("images", "labels"):
        for split in ("train", "val", "test"):
            (out / part / split).mkdir(parents=True, exist_ok=True)

    train_file = src / "train.parquet"
    val_file = src / "validation.parquet"
    for f in (train_file, val_file):
        if not f.exists():
            sys.exit(f"ERROR: cannot find {f}. Run this from the TIES4570_CSDP_Sayeem folder.")

    # 1) Decide which source photos go to test (no image data loaded yet)
    ids = pq.read_table(train_file, columns=["source_image_id"]).column(0).to_pylist()
    groups = sorted({str(i) for i in ids})
    random.Random(SEED).shuffle(groups)
    test_groups = set(groups[: max(1, int(len(groups) * TEST_SHARE))])

    counts, boxes = Counter(), {s: Counter() for s in ("train", "val", "test")}
    cols = ["index", "image", "labels", "source_image_id"]

    # 2) Write files in small batches so the PC does not run out of memory
    print("Unpacking train.parquet (this takes a few minutes)...")
    for batch in pq.ParquetFile(train_file).iter_batches(batch_size=100, columns=cols):
        for row in batch.to_pylist():
            split = "test" if str(row["source_image_id"]) in test_groups else "train"
            write_example(row, split, counts, boxes)
        print(f"  {counts['train'] + counts['test']} images done", end="\r")

    print("\nUnpacking validation.parquet...")
    for batch in pq.ParquetFile(val_file).iter_batches(batch_size=100, columns=cols):
        for row in batch.to_pylist():
            write_example(row, "val", counts, boxes)

    yaml = (
        f"path: {out.resolve().as_posix()}\n"
        "train: images/train\nval: images/val\ntest: images/test\n"
        "names:\n" + "".join(f"  {k}: {v}\n" for k, v in CLASSES.items())
    )
    (out / "data.yaml").write_text(yaml)

    print("\nDONE")
    for split in ("train", "val", "test"):
        b = boxes[split]
        print(f"  {split:5}: {counts[split]:5} images | "
              + "  ".join(f"{CLASSES[c]} {b[CLASSES[c]]}" for c in CLASSES))
    print(f"  data.yaml written to {out / 'data.yaml'}")


if __name__ == "__main__":
    main()
