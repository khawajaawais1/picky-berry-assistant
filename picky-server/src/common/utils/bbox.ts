import { UnprocessableEntityException } from '@nestjs/common';

export type Bbox = [number, number, number, number];

export function parseBbox(value: unknown): Bbox {
  const parts =
    typeof value === 'string'
      ? value.split(',').map((part) => Number(part.trim()))
      : Array.isArray(value)
        ? value.map(Number)
        : [];
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isFinite(part)) ||
    parts[0] < -180 ||
    parts[0] >= parts[2] ||
    parts[2] > 180 ||
    parts[1] < -90 ||
    parts[1] >= parts[3] ||
    parts[3] > 90
  ) {
    throw new UnprocessableEntityException(
      'bbox must be four valid west,south,east,north coordinates.',
    );
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

export function bboxKm([west, south, east, north]: Bbox): {
  width: number;
  height: number;
} {
  const midLat = ((south + north) / 2) * (Math.PI / 180);
  return {
    width: (east - west) * 111.32 * Math.cos(midLat),
    height: (north - south) * 111.32,
  };
}
