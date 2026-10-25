import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card, StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { spacing } from '@/constants/theme';
import { useSavedZones } from '@/hooks/use-saved-zones';
import { useTranslation } from '@/services/i18n';

import { savedPlanSpecies, savedSpots } from '../domain/saved-spots';
import type { Species } from '../domain/species';
import type { ZoneSource } from '../domain/zone-source';
import { useZoneAnswers } from '../hooks/use-zones';
import { testZoneSource } from '../services/test-zone-source';
import { ZoneSourceRow } from './zone-source-row';

export type SavedSpotsScreenProps = {
  onBack?: () => void;
  /** Opens frame 06's map, from the empty plan's own action. */
  onBrowseZones?: () => void;
  /**
   * Opens frame 07's zone details for a saved zone the source answered, under the berry the
   * record holds. Both travel together: the score the row read and the score the screen opens
   * must be one layer (ADR-060 decision 3, widened by ADR-061).
   */
  onOpenZone?: (zoneId: string, species: Species) => void;
  /** Where the zones come from. Defaults to the pilot stub, as on frame 06 and screen 07. */
  zoneSource?: ZoneSource;
};

/**
 * The picker's plan: the zones they saved, as frame 14's “Saved spots” row opens it.
 *
 * **The design never drew this screen** (ADR-030). Its row exists on frame 14 — “Saved spots”,
 * with the plan's own count beside it — and the screen behind it was left to the app, so this is
 * the smallest honest screen that answers the row: the picker's own record, in the record's own
 * order, each row the same row frame 06's list draws (`ZoneSourceRow`), opening the zone screen
 * the map's card opens.
 *
 * **The plan is read against the zone source, one answer per saved berry** (ADR-060, ADR-061).
 * The record holds a zone and the berry whose layer the bookmark was pressed on, so the screen
 * asks the same port frame 06 and screen 07 read for each berry in the plan and draws the zone
 * from **that berry's** answer: the row shows the name, score and season the picker was looking
 * at when they saved it, and the details it opens use the same berry. A record written before
 * the berry was kept has no layer, and is shown under the pilot berry the plan always used.
 *
 * What it deliberately does not do: it does not remove anything (frame 07's bookmark is the
 * record's own control, and the record's documentation names it as the correction path), it does
 * not invent a screenshot of a zone the source does not answer to, and it claims nothing while
 * either the record or the source is still being read. A zone read that failed is stated, with
 * the saved identifiers still listed — the record is the picker's own and must not disappear
 * because a service did.
 *
 * The copy carries frame 14's own prefix (`privacy.savedSpots.*`) because the words are that
 * frame's: the row's label is this screen's title, and one word does not get two keys.
 */
export function SavedSpotsScreen({
  onBack,
  onBrowseZones,
  onOpenZone,
  zoneSource = testZoneSource,
}: SavedSpotsScreenProps) {
  const { t } = useTranslation();
  const { error, loading, zones: saved } = useSavedZones();
  const answers = useZoneAnswers(zoneSource, savedPlanSpecies(saved));

  // Each row is read from its own berry's answer; a berry still on the way leaves the rows
  // hidden rather than calling its zone undescribed before the source has spoken.
  const spots = savedSpots(saved, answers.zones);
  const waiting = !loading && !error && saved.length > 0 && answers.status === 'loading';
  const emptyPlan = !loading && !error && saved.length === 0;
  const zonesFailed = !loading && !error && saved.length > 0 && answers.status === 'error';

  return (
    <Screen
      edges={['top']}
      eyebrow={t('privacy.savedSpots.eyebrow')}
      onBack={onBack}
      title={t('privacy.savedSpots.title')}
    >
      <View className="w-full gap-gap">
        {error ? (
          <StatusMessage testID="saved-spots-error" tone="danger" variant="caption">
            {t('privacy.savedSpots.readFailed')}
          </StatusMessage>
        ) : null}

        {emptyPlan ? (
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

        {zonesFailed ? (
          <StatusMessage testID="saved-spots-zones-error" tone="danger" variant="caption">
            {t('discover.map.unavailable')}
          </StatusMessage>
        ) : null}

        {!loading && !error && !waiting
          ? spots.map((spot, index) =>
              spot.kind === 'zone' ? (
                <ZoneSourceRow
                  // The plan may name the same zone twice if the record came from outside the
                  // app (see `savedSpots`), so the row's identity is the spot's place in the list.
                  key={`${spot.zone.id}-${index}`}
                  onOpen={onOpenZone ? () => onOpenZone(spot.zone.id, spot.species) : undefined}
                  rowTestID={`saved-spot-row-${spot.zone.id}`}
                  species={spot.species}
                  zone={spot.zone}
                />
              ) : (
                // A saved identifier no zone answers to. The row names it and says nothing else:
                // the app has no data about that zone, and inventing one would be worse than the
                // gap. It claims no role because no screen has that zone's figures.
                <Card
                  key={`${spot.zoneId}-${index}`}
                  style={{ padding: spacing.section }}
                  testID={`saved-spot-row-${spot.zoneId}`}
                >
                  <AppText variant="cardHeading">{spot.zoneId}</AppText>
                </Card>
              ),
            )
          : null}
      </View>
    </Screen>
  );
}
