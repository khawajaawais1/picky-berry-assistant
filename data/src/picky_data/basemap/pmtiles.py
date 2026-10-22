"""Cut a basemap extract from a Protomaps planet build with the go-pmtiles CLI.

Install the CLI once (single binary):
  Windows: download pmtiles_*_Windows_x86_64.zip from
           https://github.com/protomaps/go-pmtiles/releases , unzip, put pmtiles.exe on PATH
  macOS:   brew install pmtiles

`pmtiles extract` reads only the byte ranges it needs over HTTP, so a Finland extract
never downloads the planet. Pick a current build date at https://maps.protomaps.com/builds/
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from ..config import OUT_DIR, PilotArea


def pmtiles_bin() -> str:
    exe = shutil.which("pmtiles") or shutil.which("pmtiles.exe")
    if not exe:
        raise RuntimeError("pmtiles CLI not found on PATH – see the install note in "
                           "picky_data/basemap/pmtiles.py")
    return exe


def extract_cmd(source: str, out: Path, bbox: tuple[float, float, float, float],
                maxzoom: int) -> list[str]:
    w, s, e, n = bbox
    return [pmtiles_bin(), "extract", source, str(out),
            f"--bbox={w},{s},{e},{n}", f"--maxzoom={maxzoom}"]


def extract(area: PilotArea, scope: str = "pilot", source: str | None = None,
            out_dir: Path = OUT_DIR) -> Path:
    cfg = area.basemap
    bbox = tuple(cfg["finland_bbox_wgs84"]) if scope == "finland" else area.bbox_wgs84
    out = out_dir / ("finland.pmtiles" if scope == "finland" else f"{area.name}.pmtiles")
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = extract_cmd(source or cfg["source"], out, bbox, int(cfg["maxzoom"]))
    subprocess.run(cmd, check=True)
    subprocess.run([pmtiles_bin(), "show", str(out)], check=False)
    return out
