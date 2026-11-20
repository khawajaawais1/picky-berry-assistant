"""
build_zone_grid.py - Berry Picker Assistant, ML team (Team Picky)
Builds the Jyvaskyla 40x40 km zone grid from Luke MS-NFI 2023 forest maps (read straight from the funet mirror)
and writes ML/models/zone_handoff/ (zone_grid.csv, zone_scorer.py, zone_preview.png, README.md, + zip).
Run from the ML folder:  python scripts/build_zone_grid.py
"""
import os, sys
try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception: pass
ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ML_DIR, "models")
os.makedirs(OUT, exist_ok=True)
import matplotlib; matplotlib.use("Agg")


import math, json, shutil, numpy as np, pandas as pd, rasterio, requests
from rasterio.windows import from_bounds
from pyproj import Transformer
BASE = os.environ.get("MSNFI_BASE", "https://mirrors.nic.funet.fi/index/geodata/luke/vmi/2023/")
CENTER_LAT, CENTER_LON = 62.2426, 25.7473      # Jyväskylä city centre
HALF_M = 20000                                  # 20 km each way -> 40 x 40 km
BLOCK = 16                                      # 16 pixels x 16 m = 256 m cells
to_tm = Transformer.from_crs(4326, 3067, always_xy=True)
to_ll = Transformer.from_crs(3067, 4326, always_xy=True)
cx, cy = to_tm.transform(CENTER_LON, CENTER_LAT)
print("Jyväskylä in ETRS-TM35FIN:", round(cx), round(cy))

def read_window(name):
    url = BASE + f"{name}_vmi1x_1923.tif"
    def _read(path):
        with rasterio.open(path) as src:
            win = from_bounds(cx - HALF_M, cy - HALF_M, cx + HALF_M, cy + HALF_M, src.transform)
            win = win.round_offsets().round_lengths()
            arr = src.read(1, window=win)
            return arr, src.window_transform(win), src.crs
    try:
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
                          GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2"):
            out = _read("/vsicurl/" + url)
        print(f"{name}: read window over HTTP", out[0].shape)
    except Exception as e:
        print(f"{name}: window read failed ({e}); downloading the whole file…")
        local = os.path.join(OUT, f"{name}_tmp.tif")
        with requests.get(url, stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(local, "wb") as f:
                for chunk in r.iter_content(1 << 22): f.write(chunk)
        out = _read(local); os.remove(local)
        print(f"{name}: read from download", out[0].shape)
    return out

pt, tr, crs = read_window("paatyyppi")
kp, tr2, _ = read_window("kasvupaikka")
ika, tr3, _ = read_window("ika")
assert tr == tr2 == tr3, "rasters are not on the same grid"
print(crs, tr)
for n, a in [("paatyyppi", pt), ("kasvupaikka", kp)]:
    v, c = np.unique(a, return_counts=True); print(n, dict(zip(v.tolist(), c.tolist())))

TYPES = ["non_forest", "herb_rich", "mesic_heath", "sub_xeric", "xeric", "peatland", "clearcut"]
ft = np.zeros(pt.shape, np.uint8)
mineral = pt == 1
ft[mineral & np.isin(kp, [1, 2])] = 1
ft[mineral & (kp == 3)] = 2
ft[mineral & (kp == 4)] = 3
ft[mineral & (kp >= 5) & (kp <= 10)] = 4
ft[(pt >= 2) & (pt <= 4)] = 5
ft[mineral & (ika >= 0) & (ika <= 10)] = 6
share = pd.Series(np.bincount(ft.ravel(), minlength=7) / ft.size, index=TYPES)
print((share * 100).round(1).to_string())

# Typical yield of an average year by forest type (kg/ha) – same table as predict_yield.py
SITE_POTENTIAL = {
    "bilberry":    {"herb_rich": 5, "mesic_heath": 25, "sub_xeric": 15, "xeric": 5,  "peatland": 10, "clearcut": 2},
    "lingonberry": {"herb_rich": 2, "mesic_heath": 10, "sub_xeric": 30, "xeric": 20, "peatland": 10, "clearcut": 25},
    "cloudberry":  {"herb_rich": 0, "mesic_heath": 0,  "sub_xeric": 0,  "xeric": 0,  "peatland": 15, "clearcut": 0},
}
H, W = (ft.shape[0] // BLOCK) * BLOCK, (ft.shape[1] // BLOCK) * BLOCK
blocks = ft[:H, :W].reshape(H // BLOCK, BLOCK, W // BLOCK, BLOCK)
rows, cols = H // BLOCK, W // BLOCK
frac = {t: (blocks == k).mean(axis=(1, 3)) for k, t in enumerate(TYPES)}

ii, jj = np.meshgrid(np.arange(rows), np.arange(cols), indexing="ij")
e = tr.c + (jj * BLOCK + BLOCK / 2) * tr.a
n = tr.f + (ii * BLOCK + BLOCK / 2) * tr.e
lon, lat = to_ll.transform(e.ravel(), n.ravel())
G = pd.DataFrame({"cell_id": [f"JKL_{r:03d}_{c:03d}" for r, c in zip(ii.ravel(), jj.ravel())],
                  "lat": np.round(lat, 6), "lon": np.round(lon, 6),
                  "e_tm35": e.ravel().round(1), "n_tm35": n.ravel().round(1)})
for t in TYPES: G[f"frac_{t}"] = frac[t].ravel().round(3)
G["main_type"] = np.array(TYPES)[np.argmax(np.stack([frac[t] for t in TYPES]), axis=0).ravel()]
for berry, pot in SITE_POTENTIAL.items():    # 0-1: share-weighted potential vs the best forest type
    best = max(pot.values())
    G[f"site_{berry}"] = sum(G[f"frac_{t}"] * v for t, v in pot.items()).div(best).round(3)
print(G.shape); print(G.main_type.value_counts().to_string())
print(G[[c for c in G.columns if c.startswith("site_")]].describe().round(3))

import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 3, figsize=(18, 6))
for a, berry, cmap in zip(ax, SITE_POTENTIAL, ["Blues", "Reds", "Oranges"]):
    im = a.imshow(G[f"site_{berry}"].values.reshape(rows, cols), cmap=cmap, vmin=0, vmax=1)
    a.plot(cols / 2, rows / 2, "k*", ms=14); a.set_title(f"{berry} – site potential (★ = Jyväskylä)")
    a.axis("off"); plt.colorbar(im, ax=a, fraction=0.046)
plt.tight_layout(); plt.savefig(os.path.join(OUT, "zone_preview.png"), dpi=110); plt.close()

open(os.path.join(OUT, 'zone_scorer.py'), 'w', encoding='utf-8').write('"""\nzone_scorer.py - coordinates -> berry picking scores (Berry Picker Assistant, Team Picky ML team)\n\n    from zone_scorer import ZoneScorer\n    zs = ZoneScorer("zone_grid.csv")\n    zs.score_location(62.2126, 25.7351)                        # coordinates only -> all berries, today\n    zs.score_location(62.2126, 25.7351, "2026-07-25")          # ...on a given date\n    zs.score_with_photo(62.2126, 25.7351, detection)           # + berry-detector result (predict.py)\n    zs.top_zones("bilberry", "2026-07-25", n=10)               # best cells for the map\n\nmap score  = 100 x site potential (forest mix of the 256 m cell) x ripeness x year quality (0.8 in a normal year)\nphoto score = berries counted by the detector (30+ of one kind in a photo = 100)\nfinal score = 40% map + 60% photo when a photo exists, otherwise the map score\nNeeds only numpy + pandas.\n"""\nimport datetime as _dt\nimport math\nimport numpy as np\nimport pandas as pd\n\nBERRIES = ["bilberry", "lingonberry", "cloudberry"]\n# Ripening windows (day of year) at latitude 62 N (Jyvaskyla); ~2 days later per degree further north\nRIPENING = {"bilberry": (190, 240), "lingonberry": (225, 280), "cloudberry": (185, 215)}\nDAYS_PER_DEGREE_NORTH = 2.0\nCELL_HALF_DIAGONAL_M = 185   # a 256 m cell; farther away than this = outside the grid\nPHOTO_FULL_SCORE_COUNT = 30  # berries of one kind in one photo that count as "excellent"\nPHOTO_WEIGHT = 0.6           # how much a photo outweighs the map\n\n\ndef _doy(date):\n    if date is None:\n        date = _dt.date.today()\n    if isinstance(date, str):\n        date = _dt.date.fromisoformat(date[:10])\n    return date.timetuple().tm_yday\n\n\ndef ripeness(berry, day_of_year, lat=62.0):\n    shift = DAYS_PER_DEGREE_NORTH * (lat - 62.0)\n    a, b = RIPENING[berry][0] + shift, RIPENING[berry][1] + shift\n    if a <= day_of_year <= b:\n        return 1.0, "ripe"\n    if a - 10 <= day_of_year < a:\n        return 0.5, "ripening soon"\n    if b < day_of_year <= b + 10:\n        return 0.5, "end of season"\n    return 0.0, "out of season"\n\n\nclass ZoneScorer:\n    def __init__(self, grid_csv="zone_grid.csv"):\n        self.g = pd.read_csv(grid_csv)\n        self._lat = np.radians(self.g["lat"].to_numpy())\n        self._lon = np.radians(self.g["lon"].to_numpy())\n\n    def _nearest(self, lat, lon):\n        la, lo = math.radians(lat), math.radians(lon)\n        d2 = (self._lat - la) ** 2 + ((self._lon - lo) * math.cos(la)) ** 2\n        i = int(d2.argmin())\n        return i, math.sqrt(d2[i]) * 6371000\n\n    @staticmethod\n    def _map_score(site, ripe, year_index):\n        return round(max(0.0, min(100.0, 100 * site * ripe * min(year_index, 2.0) / 2.0 * 1.6)), 1)\n\n    def score_location(self, lat, lon, date=None, year_index=1.0):\n        """Coordinates only -> score for every berry (date defaults to today)."""\n        i, dist = self._nearest(lat, lon)\n        if dist > CELL_HALF_DIAGONAL_M:\n            return {"inside_grid": False, "reason": "outside the demo grid (Jyvaskyla 40x40 km)"}\n        c, doy = self.g.iloc[i], _doy(date)\n        scores, season = {}, {}\n        for b in BERRIES:\n            ripe, season[b] = ripeness(b, doy, lat)\n            scores[b] = self._map_score(float(c[f"site_{b}"]), ripe, year_index)\n        best = max(scores, key=scores.get)\n        return {"inside_grid": True, "cell_id": c["cell_id"], "cell_center": [float(c["lat"]), float(c["lon"])],\n                "main_forest_type": c["main_type"],\n                "forest_mix": {k[5:]: float(v) for k, v in c.items() if k.startswith("frac_") and v >= 0.05},\n                "scores": scores, "season": season,\n                "best_berry": best if scores[best] > 0 else None, "year_index": year_index}\n\n    def score_with_photo(self, lat, lon, detection, date=None, year_index=1.0):\n        """Coordinates + berry-detector output (dict from predict.py BerryDetector.detect) -> blended scores."""\n        out = self.score_location(lat, lon, date, year_index)\n        counts = detection.get("counts", {})\n        photo = {b: round(min(100.0, 100.0 * n / PHOTO_FULL_SCORE_COUNT), 1) for b, n in counts.items()}\n        map_scores = out.get("scores", {})\n        final = {}\n        for b in sorted(set(map_scores) | set(photo)):\n            if b in photo and b in map_scores:\n                final[b] = round((1 - PHOTO_WEIGHT) * map_scores[b] + PHOTO_WEIGHT * photo[b], 1)\n            else:\n                final[b] = photo.get(b, map_scores.get(b))\n        out.update({"photo_counts": counts, "photo_scores": photo, "final_scores": final,\n                    "best_berry": max(final, key=final.get) if final and max(final.values()) > 0 else None})\n        return out\n\n    # kept for compatibility with earlier examples\n    def score_at(self, lat, lon, date=None, berry="bilberry", year_index=1.0):\n        r = self.score_location(lat, lon, date, year_index)\n        if not r["inside_grid"]:\n            return {"score": None, "reason": r["reason"]}\n        return {"score": r["scores"][berry], "berry": berry, "cell_id": r["cell_id"],\n                "main_forest_type": r["main_forest_type"], "season": r["season"][berry]}\n\n    def top_zones(self, berry, date=None, n=10, year_index=1.0):\n        """Best n cells for a berry on a date (for the map\'s \'go here\' list)."""\n        doy = _doy(date)\n        ripe = np.array([ripeness(berry, doy, la)[0] for la in self.g["lat"]])\n        s = 100 * self.g[f"site_{berry}"].to_numpy() * ripe * min(year_index, 2.0) / 2.0 * 1.6\n        top = np.argsort(-s)[:n]\n        return [{"cell_id": self.g.at[i, "cell_id"], "lat": float(self.g.at[i, "lat"]),\n                 "lon": float(self.g.at[i, "lon"]), "score": round(float(s[i]), 1),\n                 "main_forest_type": self.g.at[i, "main_type"]} for i in top]\n')

H_DIR = os.path.join(OUT, "zone_handoff"); os.makedirs(H_DIR, exist_ok=True)
G.to_csv(f"{H_DIR}/zone_grid.csv", index=False)
shutil.copy(os.path.join(OUT, "zone_scorer.py"), H_DIR); shutil.copy(os.path.join(OUT, "zone_preview.png"), H_DIR)
import sys; sys.path.insert(0, H_DIR)
from zone_scorer import ZoneScorer
zs = ZoneScorer(f"{H_DIR}/zone_grid.csv")
tests = [("Jyväskylä centre", 62.2426, 25.7473), ("Laajavuori forest", 62.2595, 25.6880),
         ("Muurame forest", 62.1300, 25.6700), ("Far outside (Helsinki)", 60.17, 24.94)]
for name, la, lo in tests:
    for berry, date in [("bilberry", "2026-07-25"), ("lingonberry", "2026-08-30")]:
        print(f"{name:24s} {berry:11s} {date}:", json.dumps(zs.score_at(la, lo, date, berry), ensure_ascii=False))
print("\nTop 5 bilberry zones on 25 July:")
for z in zs.top_zones("bilberry", "2026-07-25", n=5): print(z)

readme = f'''# Zone grid – lat/lon → berry score (Jyväskylä demo) · Team Picky ML

## Files
| File | What |
|---|---|
| `zone_grid.csv` | {len(G):,} cells of 256 m × 256 m covering 40 × 40 km around Jyväskylä |
| `zone_scorer.py` | `score_location(lat, lon, date)` (all berries), `score_with_photo(lat, lon, detection, date)` (+ berry detector), `top_zones(berry, date, n)` |
| `zone_preview.png` | maps of the site potential per berry |

## Install / use
```
pip install numpy pandas
```
```python
from zone_scorer import ZoneScorer
zs = ZoneScorer("zone_grid.csv")
zs.score_location(62.2126, 25.7351, "2026-07-25")   # all berries; date optional
# -> {{"scores": {{"bilberry": 55.0, ...}}, "best_berry": "bilberry", "season": {{..}}, "forest_mix": {{..}}, ..}}
```

## How the score is made
With a photo: final = 40% map score + 60% photo score (30+ berries of one kind in the photo = 100).

map score (0–100) = 100 × site potential × ripeness × year quality (normal year = 0.8)
- **site potential (0–1)** = forest-type mix of the cell × typical kg/ha of each type ÷ best type
  (bilberry: mesic heath; lingonberry: sub-xeric pine forest; cloudberry: peatland)
- **ripeness** = 1 inside the ripening window, 0.5 within 10 days of it, else 0; windows shift ~2 days later per degree north
- **year quality** = 1.0 (normal year); weather models did not beat this in testing (see yield_handoff)

## grid columns
cell_id, lat, lon (cell centre, WGS84), e_tm35, n_tm35 (EPSG:3067), frac_<type> (share of 16 m pixels),
main_type, site_bilberry, site_lingonberry, site_cloudberry

## Data source
Luke MS-NFI 2023 (paatyyppi, kasvupaikka, ika), 16 m, CC BY 4.0 – © Natural Resources Institute Finland (Luke).
To cover another area: change CENTER_LAT/CENTER_LON in the BPA Zone Grid notebook and re-run.
'''
open(f"{H_DIR}/README.md", "w", encoding="utf-8").write(readme)
shutil.rmtree(f"{H_DIR}/__pycache__", ignore_errors=True)
shutil.make_archive(os.path.join(OUT, "zone_handoff"), "zip", H_DIR)
print(sorted(os.listdir(H_DIR)))

for f in ["zone_scorer.py", "zone_preview.png"]:
    p = os.path.join(OUT, f)
    if os.path.exists(p): os.remove(p)
print("\nDONE ->", os.path.join(OUT, "zone_handoff"))
