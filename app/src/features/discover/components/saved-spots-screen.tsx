import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { spacing } from '@/constants/theme';
import { useSavedZones } from '@/hooks/use-saved-zones';
import { useTranslation } from '@/services/i18n';

import { savedSpots } from '../domain/saved-spots';
import { ZoneRow } from './zone-row';

export type SavedSpotsScreenProps = {
  onBack?: () => void;
  /** Opens frame 06's map, from the empty plan's own action. */
  onBrowseZones?: () => void;
  /** Opens frame 07's zone details, for the saved zones the app has a screen for. */
  onOpenZone?: () => void;
};

/**
 * The picker's plan: the zones they saved, as frame 14's “Saved spots” row opens it.
 *
 * **The design never drew this screen** (ADR-030). Its row exists on frame 14 — “Saved spots”,
 * with the plan's own count beside it — and the screen behind it was left to the app, so this is
 * the smallest honest screen that answers the row: the picker's own record, in the record's own
 * order, each row the same row frame 06's list draws (`ZoneRow`), opening the zone screen where
 * one exists. It is also the one place a saved zone can be seen as a whole: without it, a plan
 * was only visible one zone at a time, on the zone's own screen (PROJECT.md).
 *
 * What it deliberately does not do: it does not remove anything (frame 07's bookmark is the
 * record's own control, and the record's documentation names it as the correction path), it does
 * not invent a screenshot of a zone the app has no data for, and it claims nothing while the
 * record is being read or when it could not be read at all.
 *
 * The copy carries frame 14's own prefix (`privacy.savedSpots.*`) because the words are that
 * frame's: the row's label is this screen's title, and one word does not get two keys.
 */
export function SavedSpotsScreen({ onBack, onBrowseZones, onOpenZone }: SavedSpotsScreenProps) {
  const { t } = useTranslation();
  const { error, loading, zones } = useSavedZones();
  const spots = savedSpots(zones.map((zone) => zone.zoneId));

  return (
    <Screen
      edges={['top']}
      eyebrow={t('privacy.savedSpots.eyebrow')}
      onBack={onBack}
      title={t('privacy.savedSpots.title')}
    >
      <View className="w-full gap-gap">
        {error ? (
          <AppText testID="saved-spots-error" tone="danger" variant="caption">
            {t('privacy.savedSpots.readFailed')}
          </AppText>
        ) : null}

        {!loading && !error && spots.length === 0 ? (
          <>
            <AppText tone="muted" variant="bodySmall">
              {t('privacy.savedSpots.empty')}
            </AppText>
            <TextAction
              label={t('privacy.savedSpots.browse')}
              onPress={onBrowseZones}
              testID="saved-spots-browse"
            />
          </>
        ) : null}

        {spots.map((spot, index) =>
          spot.kind === 'zone' ? (
            <ZoneRow
              // The plan may name the same zone twice if the record came from outside the app (see
              // `savedSpots`), so the row's identity is the spot's place in the list.
              key={`${spot.zone.id}-${index}`}
              onOpen={onOpenZone ? () => onOpenZone() : undefined}
              rowTestID={`saved-spot-row-${spot.zone.id}`}
              zone={spot.zone}
            />
          ) : (
            // A saved identifier no zone answers to. The row names it and says nothing else: the
            // app has no data about that zone, and inventing one would be worse than the gap.
            <Card
              key={`${spot.zoneId}-${index}`}
              style={{ padding: spacing.section }}
              testID={`saved-spot-row-${spot.zoneId}`}
            >
              <AppText variant="cardHeading">{spot.zoneId}</AppText>
            </Card>
          ),
        )}
      </View>
    </Screen>
  );
}
