import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, Card, Chip } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatLongDate, formatShortDate, interpolate, useTranslation } from '@/services/i18n';

import { DEMO_LISTING, DEMO_LISTING_DETAIL } from '../domain/listing';
import { formatEuros } from '../domain/money';
import { DEMO_ORDER, orderSubtotalCents, orderTotalCents } from '../domain/order';
import { listingUnitPrice } from './listing-copy';
import { MarketDisclosure } from './market-disclosure';

export type MarketOrderScreenProps = {
  onBack?: () => void;
  /** Opens the seller's own thread (frame 17), or nothing. */
  onMessageSeller?: () => void;
};

/** The frame's 1 px hairline between the figures in its own card (node `5:23962`). */
function Divider() {
  const { colors } = useAppTheme();

  return (
    <View
      className="w-full"
      style={{ backgroundColor: colors.border, height: 1 }}
      testID="market-order-divider"
    />
  );
}

/**
 * Screen 18 · Planned marketplace · Checkout and order status (Figma node `5:23935`).
 *
 * The design's order, and the app is exact about what it is: **a demo order for a demo listing**.
 * The frame says so twice and the screen draws both — “Provider test mode” beside the disclosure
 * chip, and the status message “Test order confirmed · No real money was charged. Demo payment is
 * held by the provider.”
 *
 * What the app really does here is arithmetic on the design's own figures and two honest status
 * lines: the weight times the price (`orderSubtotalCents`), the delivery fee added to it
 * (`orderTotalCents`), and the order's own state as the frame lists it. Every figure is formatted
 * through the money formatter, so both languages write their own decimal mark.
 *
 * Two of the frame's three actions are deliberately **not drawn**, and PROJECT.md records why:
 * **“Confirm berries received”** releases the payment the provider holds, and **“Open dispute”**
 * freezes it — both act on money that is not held anywhere, and an action that cannot act claims no
 * role (AGENTS.md §11.2). The third, **“Message Matti”**, opens frame 17's thread, which does
 * exist, and is drawn whenever the route has somewhere to send it.
 *
 * The frame's own “Today” is not printed either: the demo's day is the design's 28 August 2026, and
 * a screen may not claim that a date is the day the picker is holding the phone (AGENTS.md §2.3).
 * The date the frame prints is drawn without it.
 */
export function MarketOrderScreen({ onBack, onMessageSeller }: MarketOrderScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();

  const listing = DEMO_LISTING;
  const detail = DEMO_LISTING_DETAIL;

  const amount = (cents: number) =>
    interpolate(t('market.price.symbol'), { amount: formatEuros(cents, locale) });

  const total = orderTotalCents(DEMO_ORDER, listing);

  return (
    <Screen
      edges={['top']}
      eyebrow={t('market.eyebrow.order')}
      onBack={onBack}
      title={t('market.order.title')}
    >
      <View className="w-full gap-section">
        <MarketDisclosure>
          <Chip label={t('market.order.testMode')} tone="warning" />
        </MarketDisclosure>

        <Callout
          icon={<Feather color={colors.success} name="check-circle" size={20} />}
          testID="market-order-confirmed"
          title={t('market.order.confirmed.title')}
          tone="success"
        >
          {t('market.order.confirmed.body')}
        </Callout>

        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <AppText variant="sectionHeading">{listing.name}</AppText>
          <AppText tone="muted" variant="caption">
            {interpolate(t('market.order.by'), {
              seller: listing.seller.name,
              // The frame's own two forms of one day on one screen: the card writes the year
              // (“28 Aug 2026”, node `5:23961`) and the pickup row does not (node `5:23978`).
              date: formatLongDate(detail.harvestedOn, locale),
            })}
          </AppText>

          <Divider />

          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} variant="message">
              {interpolate(t('market.order.line'), {
                kilograms: String(DEMO_ORDER.kilograms),
                unit: listingUnitPrice(listing, locale, t),
              })}
            </AppText>
            <AppText variant="cardLead">{amount(orderSubtotalCents(DEMO_ORDER, listing))}</AppText>
          </View>

          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} tone="muted" variant="bodySmall">
              {t('market.order.delivery')}
            </AppText>
            <AppText tone="muted" variant="bodySmall">
              {amount(DEMO_ORDER.deliveryCents)}
            </AppText>
          </View>

          <Divider />

          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} variant="sectionHeading">
              {t('market.order.total')}
            </AppText>
            <AppText tone="accent" variant="priceTotal">
              {amount(total)}
            </AppText>
          </View>
        </Card>

        <View className="w-full gap-gap">
          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="map-pin" size={22} />
            <View className="flex-1 gap-tight">
              <AppText variant="cardLead">
                {interpolate(t('market.order.pickup.title'), { name: listing.seller.name })}
              </AppText>
              <AppText tone="muted" variant="caption">
                {interpolate(t('market.order.pickup.meta'), {
                  date: formatShortDate(detail.harvestedOn, locale),
                  time: DEMO_ORDER.pickupTime,
                  place: detail.pickup.place,
                  town: listing.place.town,
                })}
              </AppText>
            </View>
          </View>

          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.success} name="check-circle" size={22} />
            <AppText style={{ flex: 1 }} variant="bodySmall">
              {t('market.order.status.confirmed')}
            </AppText>
          </View>

          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.textMuted} name="circle" size={22} />
            <AppText style={{ flex: 1 }} tone="muted" variant="bodySmall">
              {t('market.order.status.waiting')}
            </AppText>
          </View>
        </View>

        <Callout
          icon={<Feather color={colors.accent} name="shield" size={20} />}
          testID="market-order-hold"
          title={t('market.order.hold.title')}
          tone="accent"
        >
          {interpolate(t('market.order.hold.body'), { name: listing.seller.name })}
        </Callout>

        {onMessageSeller ? (
          <AppButton
            icon={<Feather color={colors.accent} name="message-circle" size={20} />}
            label={interpolate(t('market.order.message'), { name: listing.seller.name })}
            onPress={onMessageSeller}
            testID="market-order-message"
            variant="secondary"
          />
        ) : null}

        <AppText tone="muted" variant="metadata">
          {t('market.order.disputeNote')}
        </AppText>
      </View>
    </Screen>
  );
}
