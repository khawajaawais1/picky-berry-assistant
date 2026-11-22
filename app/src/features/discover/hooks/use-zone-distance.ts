import { useDevicePosition } from '@/hooks/use-device-position';

import { bearingDegrees, distanceMeters, ringCentre, type LngLat } from '../domain/route';
import type { Zone } from '../domain/zone-source';

export type ZoneDistance = {
  /** The zone's middle, which directions lead to. */
  centre: LngLat;
  /** Metres and heading from the phone, or `null` while there is no position fix. */
  meters: number | null;
  bearing: number | null;
};

/** How far the zone is from the phone, from the position the picker allowed the app to read. */
export function useZoneDistance(zone: Zone | undefined): ZoneDistance | null {
  const { fix } = useDevicePosition();
  if (!zone) return null;

  const centre = ringCentre(zone.ring as readonly LngLat[]);
  if (!fix) return { centre, meters: null, bearing: null };

  const here: LngLat = [fix.longitude, fix.latitude];
  return { centre, meters: distanceMeters(here, centre), bearing: bearingDegrees(here, centre) };
}
