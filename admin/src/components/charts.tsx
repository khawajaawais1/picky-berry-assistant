import type { DailyCount, DailyJobs, DistributionBucket } from '../api/types';
import { formatNumber, formatShortDate } from '../lib/format';

export function LineChart({
  data,
  label,
  colour = 'var(--accent)',
}: {
  data: DailyCount[];
  label: string;
  colour?: string;
}) {
  if (data.length === 0) return <p className="muted">No data in this range.</p>;

  const width = 720;
  const height = 200;
  const padX = 38;
  const padTop = 18;
  const padBottom = 28;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((point) => point.count));
  const x = (index: number) =>
    padX +
    (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
  const y = (value: number) => padTop + (1 - value / max) * innerHeight;
  const line = data
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.count).toFixed(1)}`,
    )
    .join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${height - padBottom} L${x(0).toFixed(1)},${height - padBottom} Z`;
  const total = data.reduce((sum, point) => sum + point.count, 0);

  return (
    <figure className="chart-figure">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart"
        role="img"
        aria-label={`${label}: ${formatNumber(total)} total across ${data.length} days`}
      >
        <title>{label}</title>
        {[0, 0.5, 1].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padTop + innerHeight * (1 - fraction)}
            y2={padTop + innerHeight * (1 - fraction)}
            className="chart-grid"
          />
        ))}
        <path d={area} fill={colour} fillOpacity={0.12} />
        <path
          d={line}
          fill="none"
          stroke={colour}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <text x={padX} y={padTop + 4} className="chart-axis">
          {formatNumber(max)}
        </text>
        <text x={padX} y={height - padBottom - 2} className="chart-axis">
          0
        </text>
        <text x={padX} y={height - 6} className="chart-axis">
          {formatShortDate(data[0].date)}
        </text>
        <text
          x={width - padX}
          y={height - 6}
          textAnchor="end"
          className="chart-axis"
        >
          {formatShortDate(data[data.length - 1].date)}
        </text>
      </svg>
      <figcaption className="chart-caption">
        {label} · {formatNumber(total)} in this range
      </figcaption>
    </figure>
  );
}

export function StackedBars({ data }: { data: DailyJobs[] }) {
  const max = Math.max(1, ...data.map((day) => day.done + day.failed));
  const totalDone = data.reduce((sum, day) => sum + day.done, 0);
  const totalFailed = data.reduce((sum, day) => sum + day.failed, 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <figure className="chart-figure">
      <div
        className="bars"
        role="img"
        aria-label={`Jobs finished per day: ${totalDone} done, ${totalFailed} failed`}
      >
        {data.map((day, index) => (
          <div
            key={day.date}
            className="bar-col"
            title={`${day.date}: ${day.done} done, ${day.failed} failed`}
          >
            <div className="bar-stack">
              <span
                className="bar-seg bar-done"
                style={{ height: `${(day.done / max) * 100}%` }}
              />
              <span
                className="bar-seg bar-failed"
                style={{ height: `${(day.failed / max) * 100}%` }}
              />
            </div>
            {index === 0 ||
            index === data.length - 1 ||
            index % labelEvery === 0 ? (
              <span className="bar-label">{formatShortDate(day.date)}</span>
            ) : (
              <span className="bar-label" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </div>
        ))}
      </div>
      <figcaption className="chart-caption">
        <span className="legend">
          <span className="legend-swatch bar-done" /> {totalDone} done
        </span>
        <span className="legend">
          <span className="legend-swatch bar-failed" /> {totalFailed} failed
        </span>
      </figcaption>
    </figure>
  );
}

export function DistributionBar({
  buckets,
  colour = 'var(--accent)',
}: {
  buckets: DistributionBucket[];
  colour?: string;
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) return <p className="muted small">No current scores.</p>;

  return (
    <div
      className="dist"
      role="img"
      aria-label={`Score distribution across ${total} current zone scores`}
    >
      <div className="dist-track">
        {buckets.map((bucket) => (
          <span
            key={bucket.min}
            className="dist-seg"
            style={{
              width: `${(bucket.count / total) * 100}%`,
              background: colour,
              opacity: 0.35 + (bucket.min / 100) * 0.65,
            }}
            title={`${bucket.min}–${bucket.max}: ${bucket.count} scores`}
          />
        ))}
      </div>
      <div className="dist-axis">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
