import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card, TextAction } from '@/components/molecules';
import {
  PrototypeSwitcher,
  type PrototypeVariant,
} from '@/components/prototype/prototype-switcher';
import { Screen } from '@/components/templates';
import { layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useSavedZones } from '@/hooks/use-saved-zones';
import { interpolate, useTranslation } from '@/services/i18n';

import { formatDistance } from '../../domain/route';
import { savedPlanSpecies, savedSpots } from '../../domain/saved-spots';
import { CARD_ZONE_STATE, DEMO_ZONES, type DemoZone } from '../../domain/zone';
import { DEMO_ZONE_DETAILS, SCORE_MAX } from '../../domain/zone-details';
import { useZoneAnswers } from '../../hooks/use-zones';
import { testZoneSource } from '../../services/test-zone-source';
import { DesignZoneCard } from '../design-zone-card';
import { DesignZoneMap } from '../design-zone-map';
import { ZoneSourceRow } from '../zone-source-row';
import { ZoneStateLegend } from '../zone-state-legend';

/**
 * PROTOTYPE — throwaway code, not screens.
 *
 * **The question:** where does the design's “community map” live, and what does one shared spot
 * look like? The owner asked for sharing and chose frame 14's own model on 2026-10-10 — a shared
 * spot is a *place*, never a position, shared with people you invite (PROJECT.md, “Recorded
 * requirement”) — but the design file draws the model and **no community map, no share control and
 * no invite list**. So this is the paper the designer reacts to instead of answering
 * [to-questionnaire-community-map.md](../../../../../to-questionnaire-community-map.md) §1 in the
 * abstract, exactly as the sign-in prototype is for its own section.
 *
 * **The plan:** three readings, each on the screen that reading would give the thing, switchable
 * from the floating bar (the arrows navigate, because these variants disagree about *where* it
 * lives and not only about how it looks):
 *
 * - **A · Map layer** (`/discover`, frame 06) — other people's spots are a second layer on the
 *   map the picker is already reading, so the community map is frame 06's own map grown a layer.
 * - **B · Under the zone** (`/zone-details`, frame 07) — nothing new on the map: the places people
 *   shared for a zone are listed under that zone's own figures, so sharing is something you meet
 *   *inside* a zone you are looking at.
 * - **C · Place cards** (`/saved-spots`, ADR-030's screen) — no map at all: each shared place is a
 *   card carrying the person who shared it, in the place where the picker's own places already
 *   live, so the community map is people showing you places.
 *
 * The three also disagree about **what a spot is**, which §1 of the questionnaire asks and no one
 * has answered: A marks places on the map without saying how they relate to a zone, B places a
 * spot *inside* a zone (and names the zone), C makes the place and the person the same unit. That
 * disagreement is the point — the designer can answer by picking one, or by saying “the header from
 * B with the cards from C”.
 *
 * What this file deliberately does **not** do:
 *
 * - it does not decide the undecided: frame 14's third state, “Public: visible on the community
 *   map”, is not drawn, and every reading ends by naming what it left out;
 * - it does not add copy to the catalogue — these strings are hard-coded English (with the app's
 *   real copy where a real screen's words belong), because a prototype's wording is not a
 *   translation anyone should review;
 * - it does not send, store or read anything of its own: the shared spots below are the
 *   prototype's invention (class E in docs/demo-and-stand-ins.md), and C reads the picker's real
 *   plan from the device only to show where the cards would sit beside it.
 *
 * Delete this folder when the design question is answered; the reading that wins is rewritten
 * properly — with its copy in the catalogue, its states and its tests — on its own frame. See
 * ADR-016 and `docs/demo-and-stand-ins.md` §6.
 */

const PROTOTYPE_EYEBROW = 'PROTOTYPE · COMMUNITY MAP';

/** The marker's own size. Not a touch target: a mark on the drawing claims no role. */
const MARKER_SIZE = 26;

/**
 * Where the readings put the marks, as fractions of the map box. **The prototype's own invention**
 * — a real layer's position would come from the spot's own coordinates, and there are none yet.
 */
const MARKER_POSITIONS = [
  { left: '26%', top: '30%' },
  { left: '58%', top: '52%' },
  { left: '40%', top: '70%' },
] as const;

/**
 * The prototype's own shared spots — **not product data, not the design's sample**.
 *
 * The design draws no community map, so there is nothing to copy: these exist to give the three
 * readings something with a realistic shape (a place, a zone, a person, when, and what they
 * wrote) to disagree about. The names are the design's own kind of example — the app already
 * ships “Aino Korhonen” as a placeholder on screen 03 — and the places are invented.
 */
type SharedSpot = {
  id: string;
  /** The place, as a picker would name it. The design's own word for what is shared. */
  place: string;
  /** The zone the place is in, as a zone identifier, so a reading can name the zone. */
  zoneId: string;
  sharer: string;
  /** The sharer's initials, for the readings that draw a monogram rather than a name. */
  initials: string;
  /** How long ago it was shared, in words: a prototype has no clock and no store. */
  when: string;
  distanceMeters: number;
  /** What the sharer wrote. The questionnaire asks whether a spot carries words at all. */
  note: string;
};

const SHARED_SPOTS: readonly SharedSpot[] = [
  {
    id: 'behind-the-lake',
    place: 'Behind the lake',
    zoneId: 'Z14',
    sharer: 'Aino K.',
    initials: 'AK',
    when: '2 days ago',
    distanceMeters: 1200,
    note: 'Big lingonberry patch on the north side — the bog is dry this year.',
  },
  {
    id: 'the-clearing',
    place: 'The clearing',
    zoneId: 'Z14',
    sharer: 'Mikko',
    initials: 'M',
    when: '5 h ago',
    distanceMeters: 850,
    note: 'Picked 2 kg before the rain. Bilberry everywhere you look.',
  },
  {
    id: 'by-the-rocks',
    place: 'By the rocks',
    zoneId: 'Z09',
    sharer: 'Elina',
    initials: 'E',
    when: 'yesterday',
    distanceMeters: 2400,
    note: 'Both sides of the trail, the sunnier half is better.',
  },
];

const CARD_ZONE: DemoZone | undefined = DEMO_ZONES.find((zone) => zone.state === CARD_ZONE_STATE);

/** The zone's own number, as the app prints it (“14”). */
function zoneNumber(zoneId: string): string {
  return DEMO_ZONES.find((zone) => zone.id === zoneId)?.number ?? '';
}

/** One line naming what a reading left out, so a reviewer is told rather than left guessing. */
function LeftOut({ children }: { children: string }) {
  return (
    <AppText tone="muted" variant="metadata">
      {children}
    </AppText>
  );
}

/** The “shared” marker the readings that mark something on a screen draw. */
function SharedPill({ label }: { label: string }) {
  const { colors } = useAppTheme();

  return (
    <View
      className="h-chip flex-row items-center rounded-pill px-gap"
      style={{ backgroundColor: colors.accentMuted }}
    >
      <AppText tone="accent" variant="label">
        {label}
      </AppText>
    </View>
  );
}

/**
 * A — the community map as a **second layer on frame 06's map**.
 *
 * The map, its legend and the frame's own zone card are the real components, because this reading's
 * claim is that nothing new is needed except the layer: the picker's own zones stay exactly as the
 * frame draws them and other people's places are painted over them.
 */
function MapLayerReading({
  onOpenPlace,
  onOpenZone,
}: {
  onOpenPlace: (spot: SharedSpot) => void;
  onOpenZone: () => void;
}) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const labelled = SHARED_SPOTS[0]!;

  return (
    <Screen eyebrow={PROTOTYPE_EYEBROW} title={t('discover.title')}>
      <View className="w-full gap-section">
        <View className="w-full">
          <DesignZoneMap zones={DEMO_ZONES} />

          {/* The reading's whole claim, drawn: other people's spots over the zones the picker's
              own legend explains. Nothing here is a control — pressing a shared place would open a
              screen the design has not drawn — so a mark carries a name and claims no role
              (AGENTS.md §11.2). */}
          <View
            accessibilityLabel={`${SHARED_SPOTS.length} spots shared with you`}
            pointerEvents="box-none"
            style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
          >
            {SHARED_SPOTS.map((spot, position) => (
              <View
                accessibilityLabel={`${spot.place}, shared by ${spot.sharer}, ${spot.when}`}
                className="items-center justify-center rounded-pill"
                key={spot.id}
                style={{
                  ...MARKER_POSITIONS[position % MARKER_POSITIONS.length]!,
                  backgroundColor: colors.surface,
                  borderColor: colors.accent,
                  borderWidth: 2,
                  height: MARKER_SIZE,
                  position: 'absolute',
                  width: MARKER_SIZE,
                }}
              >
                <Feather color={colors.accent} name="map-pin" size={12} />
              </View>
            ))}

            {/* One name on the map, the way frame 06 labels its own zones: a layer with no words
                on it is a set of dots. */}
            <View
              className="flex-row items-center rounded-pill px-cardGap py-setting"
              style={{
                backgroundColor: colors.surface,
                left: '30%',
                position: 'absolute',
                top: '18%',
              }}
            >
              <AppText style={{ fontWeight: '600' }} variant="mapLabel">
                {labelled.place}
              </AppText>
            </View>
          </View>
        </View>

        <ZoneStateLegend />

        <View className="w-full flex-row items-center gap-sm">
          <View
            style={{
              backgroundColor: colors.accent,
              borderRadius: radii.pill,
              height: layout.mapLegendSwatch,
              width: layout.mapLegendSwatch,
            }}
          />
          <AppText style={{ flexShrink: 1 }} tone="muted" variant="metadata">
            {`Shared spot — a place someone picked and shared with you (${SHARED_SPOTS.length} now)`}
          </AppText>
        </View>

        <DesignZoneCard onPress={onOpenZone} />

        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <View className="w-full flex-row items-center justify-between">
            <AppText variant="sectionHeading">Shared with you</AppText>
            <SharedPill label={`${SHARED_SPOTS.length} places`} />
          </View>

          {SHARED_SPOTS.map((spot) => (
            <View className="w-full gap-tight" key={spot.id}>
              <AppText variant="cardTitle">{spot.place}</AppText>
              <AppText tone="muted" variant="metadata">
                {`Shared by ${spot.sharer} · ${spot.when} · ${formatDistance(spot.distanceMeters, locale)} away · Zone ${zoneNumber(spot.zoneId)}`}
              </AppText>
            </View>
          ))}

          <TextAction label={`Open “${labelled.place}”`} onPress={() => onOpenPlace(labelled)} />

          <LeftOut>
            Left out on purpose: frame 14’s “Public” state, an invite list, and any way to remove a
            spot someone else shared.
          </LeftOut>
        </Card>
      </View>
    </Screen>
  );
}

/**
 * B — the community map as a **list under a zone's own screen**.
 *
 * The reading opens on the zone's own figures (the real demo figures, in the real copy, so the
 * section is judged at frame 07's density) and then says what people shared for *this* zone. Its
 * claim is that sharing is met inside a zone, not on a map of its own.
 */
function UnderTheZoneReading() {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const details = DEMO_ZONE_DETAILS;
  const here = SHARED_SPOTS.filter((spot) => spot.zoneId === CARD_ZONE?.id);

  return (
    <Screen
      eyebrow={PROTOTYPE_EYEBROW}
      title={interpolate(t('discover.details.title'), {
        place: t('discover.map.place'),
        zone: CARD_ZONE?.number ?? '',
      })}
    >
      <View className="w-full gap-section">
        {/* Frame 07's own yield card, kept so the reading is not judged against an empty screen.
            The real screen draws more above and below it (its hero, its species row, its outlook);
            the prototype keeps the part the section has to sit under. */}
        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ color: colors.accent }} variant="metric">
              {details.score}
            </AppText>
            <View className="flex-1 gap-xs">
              <AppText style={{ fontWeight: '600' }} variant="bodySmall">
                {interpolate(t('discover.details.scoreLabel'), { max: String(SCORE_MAX) })}
              </AppText>
              <AppText tone="success" variant="label">
                {t('discover.details.confidence.high')}
              </AppText>
              <AppText tone="muted" variant="metadata">
                {interpolate(t('discover.details.reportsThisWeek'), {
                  count: String(details.reportsThisWeek),
                })}
              </AppText>
            </View>
          </View>
        </Card>

        <View className="w-full gap-gap">
          <View className="w-full flex-row items-center justify-between">
            <AppText variant="sectionHeading">Shared here</AppText>
            <SharedPill label={`${here.length} places`} />
          </View>

          <AppText tone="muted" variant="bodySmall">
            Places other pickers shared with you in this zone. Their own position is not on this
            screen and never was: a shared spot is a place.
          </AppText>

          {here.map((spot) => (
            <Card key={spot.id} style={{ gap: spacing.setting, padding: spacing.section }}>
              <AppText variant="cardHeading">{spot.place}</AppText>
              <AppText tone="muted" variant="caption">
                {`Shared by ${spot.sharer} · ${spot.when} · ${formatDistance(spot.distanceMeters, locale)} away`}
              </AppText>
              <AppText variant="bodySmall">{spot.note}</AppText>
            </Card>
          ))}

          <LeftOut>
            Not drawn: the empty state (nobody has shared a place here yet), a spot whose sharer
            removed it, and any action — the rows are readings, and no screen opens a shared place.
          </LeftOut>
        </View>
      </View>
    </Screen>
  );
}

/**
 * C — the community map as **place cards carrying the sharer**, where the picker's own places live.
 *
 * Its claim is the most different of the three: there is no map and no zone screen. A shared place
 * is a card, a card names the person who shared it, and the cards sit in the plan screen frame 14's
 * own row opens — so the community map is people showing you places, filed with your own.
 */
function PlaceCardsReading({ onOpenPlace }: { onOpenPlace: (spot: SharedSpot) => void }) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const { error, loading, zones: saved } = useSavedZones();
  const answers = useZoneAnswers(testZoneSource, savedPlanSpecies(saved));
  const plan = savedSpots(saved, answers.zones);

  return (
    <Screen eyebrow={PROTOTYPE_EYEBROW} title={t('privacy.savedSpots.title')}>
      <View className="w-full gap-section">
        <AppText tone="muted" variant="bodySmall">
          This reading files shared places in the picker’s own plan — the screen frame 14’s “Saved
          spots” row opens, whose title is the one above — as one card per place, with the person
          who shared it on the card.
        </AppText>

        <View className="w-full gap-gap">
          <View className="w-full flex-row items-center justify-between">
            <AppText variant="sectionHeading">Shared with you</AppText>
            <SharedPill label={`${SHARED_SPOTS.length} places`} />
          </View>

          {SHARED_SPOTS.map((spot) => (
            <Pressable
              accessibilityLabel={`Open ${spot.place}, shared by ${spot.sharer}`}
              accessibilityRole="button"
              key={spot.id}
              onPress={() => onOpenPlace(spot)}
              style={{ minHeight: layout.minTouchTarget }}
            >
              <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
                <View className="w-full flex-row items-center gap-gap">
                  <View
                    className="items-center justify-center rounded-pill"
                    style={{
                      backgroundColor: colors.accentMuted,
                      height: layout.sellerAvatar,
                      width: layout.sellerAvatar,
                    }}
                  >
                    <AppText tone="accent" variant="label">
                      {spot.initials}
                    </AppText>
                  </View>
                  <View className="flex-1 gap-tight">
                    <AppText variant="cardLead">{spot.sharer}</AppText>
                    <AppText tone="muted" variant="caption">{`shared this ${spot.when}`}</AppText>
                  </View>
                  <Feather color={colors.textMuted} name="chevron-right" size={20} />
                </View>

                <AppText variant="cardHeading">{spot.place}</AppText>
                <AppText variant="bodySmall">{spot.note}</AppText>
                <AppText tone="muted" variant="metadata">
                  {`Zone ${zoneNumber(spot.zoneId)} · ${formatDistance(spot.distanceMeters, locale)} away`}
                </AppText>
              </Card>
            </Pressable>
          ))}

          <LeftOut>
            Left out on purpose: whether a shared place belongs on this screen at all, the frame’s
            “Public” state, and any way to un-share or to leave the list.
          </LeftOut>
        </View>

        <View className="w-full gap-gap">
          <AppText variant="sectionHeading">Your own plan</AppText>

          {error ? (
            <AppText tone="danger" variant="caption">
              {t('privacy.savedSpots.readFailed')}
            </AppText>
          ) : null}

          {!loading && !error && plan.length === 0 ? (
            <AppText tone="muted" variant="bodySmall">
              {t('privacy.savedSpots.empty')}
            </AppText>
          ) : null}

          {/* The picker's real plan, as the real screen draws it: the reading has to sit beside
              what the app actually holds, not beside more invention. */}
          {plan.map((spot, index) =>
            spot.kind === 'zone' ? (
              <ZoneSourceRow
                key={`${spot.zone.id}-${index}`}
                rowTestID={`prototype-plan-row-${spot.zone.id}`}
                species={spot.species}
                zone={spot.zone}
              />
            ) : (
              <Card key={`${spot.zoneId}-${index}`} style={{ padding: spacing.section }}>
                <AppText variant="cardHeading">{spot.zoneId}</AppText>
              </Card>
            ),
          )}
        </View>
      </View>
    </Screen>
  );
}

export type CommunityMapVariantKey = 'A' | 'B' | 'C';

/**
 * The three readings, each naming the route it is drawn on: this prototype's variants answer “which
 * screen” as much as “which shape”, so the bar navigates between them (see `PrototypeSwitcher`).
 */
export const COMMUNITY_MAP_VARIANTS: readonly PrototypeVariant[] = [
  { key: 'A', name: 'Map layer', path: '/discover' },
  { key: 'B', name: 'Under the zone', path: '/zone-details' },
  { key: 'C', name: 'Place cards', path: '/saved-spots' },
];

/** True for a `?variant=` value this prototype knows. */
export function isCommunityMapVariantKey(
  value: string | undefined,
): value is CommunityMapVariantKey {
  return COMMUNITY_MAP_VARIANTS.some((variant) => variant.key === value);
}

/**
 * The reading a route draws when `?variant=` asks for it, or nothing.
 *
 * A route therefore never learns which reading is its own: the table above is the one place that
 * says a reading lives here, and a route reached with another reading's key (a stale link, a hand
 * typed URL) draws its real screen instead of someone else's reading.
 */
export function communityMapReading(
  route: string,
  value: string | undefined,
): CommunityMapVariantKey | undefined {
  const variant = COMMUNITY_MAP_VARIANTS.find(
    (entry) => entry.path === route && entry.key === value,
  );

  return variant && isCommunityMapVariantKey(variant.key) ? variant.key : undefined;
}

export type CommunityMapPrototypeProps = {
  variant: CommunityMapVariantKey;
};

/**
 * The three readings behind their three routes. Each action reports what the real screen would do,
 * which the switcher's note line prints: the community map has no screen behind it yet, so the
 * point of pressing is to see the intended consequence rather than a result.
 */
export function CommunityMapPrototype({ variant }: CommunityMapPrototypeProps) {
  const [note, setNote] = useState<string | null>(null);
  const report = (message: string) => () => setNote(message);

  return (
    <>
      {variant === 'A' ? (
        <MapLayerReading
          onOpenPlace={report(
            '“Open “Behind the lake”” → a place’s own screen, which no design frame draws',
          )}
          onOpenZone={report('the frame’s zone card → screen 07 · Zone details, which exists')}
        />
      ) : null}

      {variant === 'B' ? <UnderTheZoneReading /> : null}

      {variant === 'C' ? (
        <PlaceCardsReading
          onOpenPlace={report(
            'a shared place → the place’s own screen, which no design frame draws',
          )}
        />
      ) : null}

      {/* All three readings are drawn on screens the app shell already gives a bar to, so the
          switcher floats above it: the shell's bar is chrome, and a prototype's own bar hidden
          behind it is a prototype nobody can flip. */}
      <PrototypeSwitcher
        current={variant}
        lift={layout.navHeight}
        note={note ?? undefined}
        variants={COMMUNITY_MAP_VARIANTS}
      />
    </>
  );
}
