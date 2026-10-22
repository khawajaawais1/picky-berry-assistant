// D18 – MapLibre style JSON for the Protomaps basemap (light flavour, Finnish labels).
// Usage (from data/scripts):
//   npm install @protomaps/basemaps@5
//   node make_style.mjs pmtiles://https://<bucket>/tiles/finland.pmtiles > ../out/style.json
// Local dev: pass the MinIO URL, e.g. pmtiles://http://localhost:9000/picky-public/tiles/finland.pmtiles
import { layers, namedFlavor } from "@protomaps/basemaps";

const url = process.argv[2] ?? "pmtiles://http://localhost:9000/picky-public/tiles/finland.pmtiles";
const lang = process.argv[3] ?? "fi";

const style = {
  version: 8,
  name: "picky-basemap-light",
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
  sources: {
    protomaps: {
      type: "vector",
      url,
      attribution: "© OpenStreetMap contributors, Protomaps",
    },
  },
  layers: layers("protomaps", namedFlavor("light"), { lang }),
};

process.stdout.write(JSON.stringify(style, null, 1));
