"""picky-data – one CLI for Awais's pipelines.  Run `picky-data <command> --help`.

Typical order (deep dive §11, weeks 1–3):
  picky-data area                       D3  write pilot square for review (QGIS / geojson.io)
  picky-data test-zones                 D10 stub: 50 zones → data/test_zones.geojson
  picky-data basemap --scope pilot      D18 PMTiles extract (needs pmtiles CLI)
  picky-data msnfi-download             D10 pilot cut of Luke's forest inventory (6 layers)
  picky-data zones --msnfi-dir raw/msnfi D10 (OSM forest + MS-NFI bogs/tree species/fertility)
  picky-data zone-species               D11
  picky-data weather --start 2021-01-01 D13 (FMI backfill + GDD + IDW weights)
  picky-data ndvi --start 2021-04-01    D14 (or --stub)
  picky-data check                      file checks (add --db after `load`)
  picky-data load                       upsert everything into Postgres
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date, timedelta
from pathlib import Path

from .config import DATA_DIR, OUT_DIR, PilotArea, ensure_dirs, load_env

log = logging.getLogger("picky_data")

STUB_STATION = {"fmisid": 101339, "name": "Jyväskylä lentoasema", "lat": 62.39758, "lon": 25.67087}


def _area(args) -> PilotArea:
    return PilotArea.load(args.config)


def cmd_area(args) -> int:
    import geopandas as gpd

    area = _area(args)
    out = OUT_DIR / "pilot_area.geojson"
    gpd.GeoDataFrame({"name": [area.name]}, geometry=[area.polygon_3067], crs="EPSG:3067") \
        .to_crs(4326).to_file(out, driver="GeoJSON")
    w, s, e, n = area.bbox_wgs84
    print(f"Pilot area '{area.name}': 60 × 60 km, EPSG:3067 {area.bbox_3067}")
    print(f"WGS84 envelope: W {w}  S {s}  E {e}  N {n}")
    print(f"→ {out}  (drop into geojson.io or QGIS to agree it with the team)")
    return 0


def cmd_test_zones(args) -> int:
    from .zones.test_zones import write_test_zones

    path = write_test_zones(Path(args.out))
    print(f"wrote 50 stub zones → {path}")
    return 0


def cmd_zones(args) -> int:
    from .zones.build import build_zones, write_zones
    from .zones.forest_mask import load_vector_mask, read_geofabrik
    from .zones.msnfi import MsnfiRasters
    from .zones.naming import read_places_geofabrik

    area = _area(args)
    src = Path(args.osm)
    mask = load_vector_mask(args.mask, area) if args.mask else read_geofabrik(src, area)
    places = None if args.no_names else read_places_geofabrik(src, area)
    if args.msnfi_dir:
        from .zones.msnfi import from_dir

        msnfi = from_dir(args.msnfi_dir)
        print(f"MS-NFI: {msnfi}")
    else:
        msnfi = MsnfiRasters(args.msnfi_pine, args.msnfi_spruce, args.msnfi_broadleaf,
                             args.msnfi_fertility, args.msnfi_site_type)
    version = args.version or f"osm-{src.stem.split('.')[0]}-{date.today():%Y%m%d}/h3r{area.zones['h3_resolution']}/v1"
    zones = build_zones(area, mask, places, msnfi, version)
    paths = write_zones(zones)
    mask.to_parquet(OUT_DIR / "habitat_mask.parquet")
    print(f"{len(zones)} zones · forest types {zones.forest_type.value_counts().to_dict()}")
    for k, p in paths.items():
        print(f"  {k}: {p}")
    return 0


def cmd_msnfi_download(args) -> int:
    import geopandas as gpd

    from .config import METRIC_CRS, RAW_DIR
    from .zones.msnfi import LAYERS, MSNFI_URL, clip_layer

    area = _area(args)
    bounds = tuple(gpd.GeoSeries([area.polygon_3067.buffer(args.buffer_m, join_style="mitre")],
                                 crs=METRIC_CRS).total_bounds)
    out_dir = Path(args.out) if args.out else RAW_DIR / "msnfi"
    for layer in args.layers or list(LAYERS):
        if args.source_dir:      # whole-Finland files already downloaded
            matches = [f for f in sorted(Path(args.source_dir).glob(f"{layer}_*.tif"))
                       if "tukki" not in f.name and "kuitu" not in f.name and "pilot" not in f.name]
            if not matches:
                print(f"  {layer}: no file in {args.source_dir}, skipped")
                continue
            source = str(matches[0])
        else:
            source = MSNFI_URL.format(year=args.year, layer=layer)
        out = out_dir / f"{layer}_pilot.tif"
        print(f"  {layer}: {source} → {out.name} …", flush=True)
        clip_layer(source, bounds, out)
        print(f"  {layer}: {out.stat().st_size / 1e6:.1f} MB")
    print(f"done → {out_dir}\nnext: picky-data zones --msnfi-dir {out_dir}")
    return 0


def cmd_zone_species(args) -> int:
    import geopandas as gpd

    from .zone_species import build_zone_species

    zones = gpd.read_parquet(OUT_DIR / "zones.parquet")
    zs = build_zone_species(zones, stub=args.stub)
    zs.to_parquet(OUT_DIR / "zone_species.parquet", index=False)
    print(f"{len(zs)} zone_species rows ({zs.rules_version.iloc[0]}) · per species "
          f"{zs.groupby('species').size().to_dict()}")
    return 0


def cmd_weather(args) -> int:
    import geopandas as gpd
    import pandas as pd

    from .weather.assign import idw_weights
    from .weather.fmi import fetch_daily, stations_gdf
    from .weather.gdd import add_gdd

    area = _area(args)
    wc = area.weather
    start = date.fromisoformat(args.start or wc["backfill_from"])
    # FMI publishes a day's values only after the day ends → default to yesterday
    end = date.fromisoformat(args.end) if args.end else date.today() - timedelta(days=1)
    stations, daily = fetch_daily(area, start, end)
    if args.stub_one_station:
        stations = pd.DataFrame([STUB_STATION])
        daily = daily[daily.fmisid == STUB_STATION["fmisid"]]
    # only keep stations that actually report temperature
    reporting = daily.dropna(subset=["tmean_c"]).fmisid.unique()
    stations = stations[stations.fmisid.isin(reporting)].reset_index(drop=True)
    daily = add_gdd(daily[daily.fmisid.isin(reporting)], float(wc["gdd_base_c"]), wc["season_start"])
    zones = gpd.read_parquet(OUT_DIR / "zones.parquet")
    weights = idw_weights(zones, stations_gdf(stations), k=int(wc["idw_max_stations"]),
                          power=float(wc["idw_power"]))
    stations.to_parquet(OUT_DIR / "weather_stations.parquet", index=False)
    daily.to_parquet(OUT_DIR / "weather_station_daily.parquet", index=False)
    weights.to_parquet(OUT_DIR / "zone_weather_weights.parquet", index=False)
    print(f"{len(stations)} stations · {len(daily)} station-days {start}→{end} · "
          f"{weights.zone_id.nunique()} zones weighted")
    return 0


def cmd_ndvi(args) -> int:
    import geopandas as gpd
    import pandas as pd

    from .ndvi.zonal import add_anomaly, stub_obs, zonal_ndvi

    area = _area(args)
    zones = gpd.read_parquet(OUT_DIR / "zones.parquet")
    out = OUT_DIR / "ndvi_obs.parquet"
    if args.stub:
        obs = stub_obs(zones)
        obs.to_parquet(out, index=False)
        print(f"D14 stub: ndvi_anomaly = 0 for {len(obs)} zones → {out}")
        return 0
    from .ndvi.copernicus import fetch_window, windows

    load_env()
    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end) if args.end else date.today()
    months = {int(m) for m in args.months.split(",")}
    frames = [pd.read_parquet(out)] if out.exists() and not args.rebuild else []
    for a, b in windows(start, end):
        if a.month not in months:
            continue
        paths = fetch_window(area, a, b)
        z = zonal_ndvi(zones, paths)
        z["period_start"], z["period_end"] = a, b
        frames.append(z)
        print(f"NDVI {a}: mean {z.ndvi_mean.mean():.3f}, clear {z.valid_fraction.mean():.0%}")
    obs = pd.concat(frames, ignore_index=True).drop_duplicates(["zone_id", "period_start"], keep="last")
    obs = add_anomaly(obs[["zone_id", "period_start", "period_end", "ndvi_mean", "valid_fraction"]],
                      list(area.ndvi["baseline_years"]))
    obs.to_parquet(out, index=False)
    print(f"{len(obs)} zone-windows → {out}")
    return 0


def cmd_basemap(args) -> int:
    from .basemap.pmtiles import extract

    path = extract(_area(args), args.scope, args.source)
    print(f"basemap → {path}\nnext: node scripts/make_style.mjs <pmtiles url> > out/style.json")
    return 0


def cmd_check(args) -> int:
    from .checks import run_file_checks

    results = run_file_checks(OUT_DIR, _area(args))
    for r in results:
        print(r)
    failed = [r for r in results if not r.ok]
    if args.db:
        from .db import run_sql_checks

        for label, n in run_sql_checks():
            print(f"[{'PASS' if n == 0 else 'FAIL'}] DB {label}" + (f" – {n} rows" if n else ""))
            failed += [label] if n else []
    print(f"\n{len(results)} file checks, {len(failed)} failed")
    return 1 if failed else 0


def cmd_load(args) -> int:
    from .db import load_all

    print(json.dumps(load_all(OUT_DIR), indent=1))
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="picky-data", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--config", help="pilot_area.yaml (default: data/config/pilot_area.yaml)")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("area", help="D3: write the pilot square as GeoJSON").set_defaults(fn=cmd_area)

    s = sub.add_parser("test-zones", help="D10 stub: 50 test zones")
    s.add_argument("--out", default=str(DATA_DIR / "test_zones.geojson"))
    s.set_defaults(fn=cmd_test_zones)

    s = sub.add_parser("zones", help="D10: forest mask → H3 zones")
    s.add_argument("--osm", default=str(DATA_DIR / "raw" / "finland-latest-free.shp.zip"),
                   help="Geofabrik finland-latest-free.shp.zip (or unpacked folder)")
    s.add_argument("--mask", help="alternative polygon file with a habitat column (forest/mire)")
    s.add_argument("--no-names", action="store_true", help="skip OSM place names")
    for opt, what in (("pine", "pine volume (manty)"), ("spruce", "spruce volume (kuusi)"),
                      ("broadleaf", "birch + other broadleaf volume (koivu, muulp)"),
                      ("fertility", "site fertility class (kasvupaikka)"),
                      ("site-type", "site main class (paatyyppi) – adds bogs OSM misses")):
        s.add_argument(f"--msnfi-{opt}", nargs="+", metavar="TIF", help=f"MS-NFI {what}; one or more map sheets")
    s.add_argument("--msnfi-dir", help="folder with MS-NFI GeoTIFFs (e.g. raw/msnfi from `msnfi-download`)")
    s.add_argument("--version", help="source_version label")
    s.set_defaults(fn=cmd_zones)

    s = sub.add_parser("msnfi-download", help="D10: cut the pilot square out of Luke's MS-NFI rasters")
    s.add_argument("--year", default="2023")
    s.add_argument("--layers", nargs="+", help="default: paatyyppi kasvupaikka manty kuusi koivu muulp")
    s.add_argument("--source-dir", help="use whole-Finland .tif files you already downloaded instead of HTTP")
    s.add_argument("--out", help="output folder (default data/raw/msnfi)")
    s.add_argument("--buffer-m", type=float, default=2000)
    s.set_defaults(fn=cmd_msnfi_download)

    s = sub.add_parser("zone-species", help="D11: habitat suitability per zone × species")
    s.add_argument("--stub", action="store_true", help="every species allowed everywhere")
    s.set_defaults(fn=cmd_zone_species)

    s = sub.add_parser("weather", help="D13: FMI daily + GDD + IDW weights")
    s.add_argument("--start"), s.add_argument("--end")
    s.add_argument("--stub-one-station", action="store_true", help="use only Jyväskylä airport")
    s.set_defaults(fn=cmd_weather)

    s = sub.add_parser("ndvi", help="D14: Sentinel-2 NDVI per zone + anomaly")
    s.add_argument("--start", default="2021-04-01"), s.add_argument("--end")
    s.add_argument("--months", default="5,6,7,8,9", help="only fetch windows starting in these months")
    s.add_argument("--rebuild", action="store_true", help="ignore existing ndvi_obs.parquet")
    s.add_argument("--stub", action="store_true", help="ndvi_anomaly = 0 for every zone")
    s.set_defaults(fn=cmd_ndvi)

    s = sub.add_parser("basemap", help="D18: PMTiles extract")
    s.add_argument("--scope", choices=["pilot", "finland"], default="pilot")
    s.add_argument("--source", help="Protomaps build URL (default from pilot_area.yaml)")
    s.set_defaults(fn=cmd_basemap)

    s = sub.add_parser("check", help="data checks on data/out (and the DB with --db)")
    s.add_argument("--db", action="store_true")
    s.set_defaults(fn=cmd_check)

    sub.add_parser("load", help="upsert data/out/* into Postgres").set_defaults(fn=cmd_load)

    args = p.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    ensure_dirs()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
