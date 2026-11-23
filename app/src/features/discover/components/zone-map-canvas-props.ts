import type { Zone } from '../domain/zone-source';
import type { DevicePositionStatus } from '@/hooks/use-device-position';
import type { PositionFix } from '@/services/location';

/**
 * What both canvases take. It lives outside the two platform files so the web one does not
 * import the native one for a type — Metro resolves the platform file by name, and a type
 * import that reaches a MapLibre module on the web build is how a native-only package ends
 * up in a browser bundle.
 */
export type ZoneMapCanvasProps = {
  fullscreen?: boolean;
  height: number;
  /** The map's text alternative, in the reader's language. */
  label: string;
  onOpenLocationSettings?: (status: DevicePositionStatus) => void;
  onSelectZone?: (zoneId: string) => void;
  position?: PositionFix | null;
  positionStatus?: DevicePositionStatus;
  selectedZoneId?: string | null;
  zones: readonly Zone[];
};
