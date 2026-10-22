"""H3 helpers: polyfill the pilot area and measure habitat coverage per cell."""
from __future__ import annotations

import uuid

import geopandas as gpd
import h3
import numpy as np
import pandas as pd
import shapely
from shapely.geometry import Polygon

from ..config import METRIC_CRS, WGS84, PilotArea

# Stable zone ids: same H3 cell → same UUID on every rebuild, so app caches,
# reports and score history never point at a vanished id.
ZONE_NAMESPACE = uuid.UUID("6f1c9a52-6c1e-4f0e-9a39-2b8d2f6b0d62")


def zone_id(h3_cell: str) -> str:
    return str(uuid.uuid5(ZONE_NAMESPACE, h3_cell))


def cells_for_area(area: PilotArea, res: int) -> list[str]:
    """All cells whose centre lies inside the pilot square (H3 'center' containment)."""
    shape = h3.geo_to_h3shape(area.polygon_wgs84.__geo_interface__)
    return sorted(h3.h3shape_to_cells(shape, res))


def cell_polygon(cell: str) -> Polygon:
    # h3 returns (lat, lng); shapely wants (x=lng, y=lat)
    return Polygon([(lng, lat) for lat, lng in h3.cell_to_boundary(cell)])


def cells_to_gdf(cells: list[str]) -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {"h3": cells},
        geometry=[cell_polygon(c) for c in cells],
        crs=WGS84,
    )


def habitat_fractions(cells_3067: gpd.GeoDataFrame, mask_3067: gpd.GeoDataFrame,
                      habitat_col: str = "habitat") -> pd.DataFrame:
    """Share of each cell covered by each habitat class (0–1), via STRtree pairs.

    ``mask_3067`` must be non-overlapping per class and across classes (see
    forest_mask.prepare_mask), so summing piece areas gives the true coverage.
    """
    cell_geoms = cells_3067.geometry.values
    cell_area = shapely.area(cell_geoms)
    classes = sorted(mask_3067[habitat_col].unique())
    out = pd.DataFrame(0.0, index=cells_3067.index, columns=classes)
    if len(mask_3067) == 0:
        return out
    tree = shapely.STRtree(mask_3067.geometry.values)
    cell_idx, mask_idx = tree.query(cell_geoms, predicate="intersects")
    inter = shapely.intersection(cell_geoms[cell_idx], mask_3067.geometry.values[mask_idx])
    pair = pd.DataFrame({
        "cell": cells_3067.index.values[cell_idx],
        "habitat": mask_3067[habitat_col].values[mask_idx],
        "area": shapely.area(inter),
    })
    summed = pair.groupby(["cell", "habitat"])["area"].sum().unstack(fill_value=0.0)
    out.loc[summed.index, summed.columns] = summed.values
    out = out.div(cell_area, axis=0).clip(0, 1)
    return out


def parent(cell: str, res: int) -> str:
    return h3.cell_to_parent(cell, res)


def to_metric(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return gdf.to_crs(METRIC_CRS)


def area_km2(gdf_3067: gpd.GeoDataFrame) -> np.ndarray:
    return gdf_3067.area.values / 1e6
