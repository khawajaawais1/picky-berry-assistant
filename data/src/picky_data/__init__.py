"""Team Picky data pipelines (owner: Awais).

D3  pilot area          -> config.PilotArea
D10 zones               -> zones.build
D11 zone_species        -> zone_species
D13 weather + GDD       -> weather.fmi, weather.gdd, weather.assign
D14 NDVI + anomaly      -> ndvi.copernicus, ndvi.zonal
D18 basemap PMTiles     -> basemap.pmtiles
"""

__version__ = "0.1.0"
