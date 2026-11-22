import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminMap, AdminMapSpot, Species } from '../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatCard,
} from '../components/ui';
import { formatNumber, formatRelative } from '../lib/format';
import { useApi } from '../lib/useApi';

/** Finland, until the API tells us where the spots are. */
const INITIAL_VIEW: L.LatLngExpression = [64.5, 26];
const INITIAL_ZOOM = 5;

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type Band = 'good' | 'warn' | 'bad' | 'none';

/** Same bands as ScorePill, so a spot reads the same on the map and in tables. */
export function scoreBand(score: number | null): Band {
  if (score === null) return 'none';
  return score >= 70 ? 'good' : score >= 45 ? 'warn' : 'bad';
}

const BAND_LABEL: Record<Band, string> = {
  good: 'Score 70+',
  warn: 'Score 45–69',
  bad: 'Score under 45',
  none: 'Not scored',
};

function bandColours(): Record<Band, string> {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    good: read('--good', '#63e0ae'),
    warn: read('--warn', '#ffc46b'),
    bad: read('--bad', '#ff8796'),
    none: read('--muted', '#a79fb8'),
  };
}

function tooltipFor(spot: AdminMapSpot): HTMLElement {
  // Built with DOM nodes, not an HTML string: zone names come from the database.
  const root = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = spot.name ?? 'Unnamed zone';
  const detail = document.createElement('div');
  detail.textContent = [
    spot.best_score === null ? 'not scored' : `best score ${spot.best_score}`,
    `${spot.reports_total} report${spot.reports_total === 1 ? '' : 's'}`,
    spot.h3,
  ].join(' · ');
  root.append(title, detail);
  return root;
}

export function MapPage() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState('');
  const path = species
    ? `/admin/map?species=${encodeURIComponent(species)}`
    : '/admin/map';
  const { data, error, loading, reload } = useApi<AdminMap>(path);
  const speciesList = useApi<{ species: Species[] }>('/species');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);

  // The map lives as long as the page; spots are redrawn into one layer group.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      worldCopyJump: false,
    }).setView(INITIAL_VIEW, INITIAL_ZOOM);
    // The site sends Referrer-Policy: no-referrer; OSM's tile servers expect a referer,
    // so tiles alone send the console's origin (never a path).
    L.tileLayer(TILE_URL, {
      maxZoom: 18,
      attribution: TILE_ATTRIBUTION,
      referrerPolicy: 'strict-origin',
    })
      .on('tileerror', () => setTilesFailed(true))
      .addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Leaflet caches the container size at creation; the page settles its layout
    // afterwards (stat tiles, scrollbar), so keep the cached size honest.
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!data) return;

    const colours = bandColours();
    for (const spot of data.spots) {
      const colour = colours[scoreBand(spot.best_score)];
      L.circleMarker([spot.lat, spot.lng], {
        radius: 6,
        weight: 1,
        color: colour,
        fillColor: colour,
        fillOpacity: 0.75,
      })
        .bindTooltip(tooltipFor(spot), { direction: 'top' })
        .on('click', () => navigate(`/zones/${spot.id}`))
        .addTo(layer);
    }
    if (data.bounds) {
      map.invalidateSize();
      map.fitBounds(
        [
          [data.bounds.min_lat, data.bounds.min_lng],
          [data.bounds.max_lat, data.bounds.max_lng],
        ],
        // No animation: a zoom animation started during the first paint can be cut
        // short, leaving the map stuck a few levels out from the spots.
        { padding: [24, 24], maxZoom: 13, animate: false },
      );
    }
  }, [data, navigate]);

  const counts = data
    ? data.spots.reduce(
        (acc, spot) => {
          acc[scoreBand(spot.best_score)] += 1;
          return acc;
        },
        { good: 0, warn: 0, bad: 0, none: 0 } as Record<Band, number>,
      )
    : null;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Operate"
        title="Map"
        description="Every spot in the pilot area from /admin/map, coloured by its best current score. Click a spot to open the zone."
        actions={
          <Button onClick={reload} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Card className="filter-card">
        <div className="filter-row">
          <div className="field">
            <label htmlFor="map-species">Species</label>
            <select
              id="map-species"
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
            >
              <option value="">All species</option>
              {(speciesList.data?.species ?? []).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name_en}
                </option>
              ))}
            </select>
          </div>
          <div className="map-legend" aria-label="Score colours">
            {(Object.keys(BAND_LABEL) as Band[]).map((band) => (
              <span key={band} className="legend">
                <span className={`legend-swatch map-band-${band}`} />
                {BAND_LABEL[band]}
                {counts ? ` (${formatNumber(counts[band])})` : ''}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {data ? (
        <div className="stats-grid">
          <StatCard label="Spots" value={formatNumber(data.total)} hint="zones with a centroid" />
          <StatCard
            label="Scored"
            value={formatNumber(data.spots.length - (counts?.none ?? 0))}
            hint={species ? `for ${species}` : 'any species'}
            tone="good"
          />
          <StatCard
            label="Reports"
            value={formatNumber(
              data.spots.reduce((sum, spot) => sum + spot.reports_total, 0),
            )}
            hint="on the spots shown"
          />
          <StatCard
            label="Read"
            value={formatRelative(data.generated_at)}
            hint="from the live database"
          />
        </div>
      ) : null}

      {data?.truncated ? (
        <p className="hint">
          <Badge tone="warn">Truncated</Badge> Showing {formatNumber(data.spots.length)} of{' '}
          {formatNumber(data.total)} spots.
        </p>
      ) : null}
      {tilesFailed ? (
        <p className="hint">
          <Badge tone="warn">Basemap not available</Badge> OpenStreetMap tiles could not be
          loaded; the spots are still plotted from the API.
        </p>
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Plotting spots…" />
      ) : data && data.spots.length === 0 ? (
        <EmptyState title="No spots to plot">
          {species
            ? 'No zone has a current score for this species.'
            : 'No zones are loaded yet. Run the ingest or seed steps, then refresh.'}
        </EmptyState>
      ) : null}

      <div
        ref={containerRef}
        className="map-canvas"
        hidden={Boolean(error)}
        role="region"
        aria-label="Map of all spots"
      />
    </div>
  );
}
