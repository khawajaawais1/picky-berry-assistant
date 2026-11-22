import { Feather } from '@/components/atoms/app-icon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, Card, FormField, StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatLongDate, interpolate, useTranslation, type TranslationKey } from '@/services/i18n';

import type { MarketListing } from '../domain/listing';
import { formatEuros } from '../domain/money';
import {
  parseOrderKilograms,
  pickupStart,
  type MarketOrder,
  type OrderStatus,
} from '../domain/order';
import type { MarketApi } from '../services/market-api';
import { listingUnitPrice } from './listing-copy';

export type MarketOrderScreenProps = {
  /** An order that exists: the screen shows it. */
  orderId?: string;
  /** A listing to order from: the screen shows the order form. */
  listingId?: string;
  marketApi: Pick<MarketApi, 'listing' | 'placeOrder' | 'order'>;
  onBack?: () => void;
  /** Where a placed order goes next (normally this screen, with the new order's id). */
  onPlaced?: (orderId: string) => void;
  onMessageSeller?: (listingId: string) => void;
};

const STATUS_KEY: Record<OrderStatus, TranslationKey> = {
  pending: 'market.order.status.pending',
  confirmed: 'market.order.status.confirmed',
  completed: 'market.order.status.completed',
  cancelled: 'market.order.status.cancelled',
};

/**
 * Screen 18 · Marketplace · Order (Figma node `5:23942`). With a listing it is the order form —
 * kilograms and a pickup time, checked against the stock — and `POST /market/orders` reserves the
 * berries; with an order it is that order's summary from `GET /market/orders/:id`. Payment is
 * made at pickup: the app holds no money.
 */
export function MarketOrderScreen(props: MarketOrderScreenProps) {
  return props.orderId ? (
    <OrderSummary {...props} orderId={props.orderId} />
  ) : (
    <OrderForm {...props} />
  );
}

function Divider() {
  const { colors } = useAppTheme();
  return <View className="w-full" style={{ backgroundColor: colors.border, height: 1 }} />;
}

function OrderForm({ listingId, marketApi, onBack, onPlaced }: MarketOrderScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const queryClient = useQueryClient();
  const listing = useQuery({
    queryKey: ['market', 'listing', listingId],
    queryFn: () => marketApi.listing(listingId!),
    enabled: listingId !== undefined,
    retry: false,
  });
  const [kilogramsText, setKilogramsText] = useState('');
  const [pickupText, setPickupText] = useState<string | null>(null);
  const place = useMutation({
    mutationFn: ({ kilograms, pickup }: { kilograms: number; pickup: string }) =>
      marketApi.placeOrder(listingId!, kilograms, pickup),
    onSuccess: async (order) => {
      queryClient.setQueryData(['market', 'order', order.id], order);
      await queryClient.invalidateQueries({ queryKey: ['market', 'listings'] });
      await queryClient.invalidateQueries({ queryKey: ['market', 'listing', listingId] });
      onPlaced?.(order.id);
    },
  });

  if (!listing.data) {
    return (
      <Screen
        eyebrow={t('market.eyebrow.order')}
        onBack={onBack}
        title={t('market.order.form.title')}
      >
        <StatusMessage
          testID="market-order-status"
          tone={listing.isError ? 'danger' : 'muted'}
          variant="bodySmall"
        >
          {t(
            listingId === undefined
              ? 'market.listing.unknown'
              : listing.isError
                ? 'market.readFailed'
                : 'common.loading',
          )}
        </StatusMessage>
      </Screen>
    );
  }

  const item: MarketListing = listing.data;
  const pickup = pickupText ?? pickupStart(item.pickup.window) ?? '';
  const kilograms = parseOrderKilograms(kilogramsText, item.availableKg);
  const pickupValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(pickup);
  const subtotal = kilograms === null ? null : Math.round(kilograms * item.pricePerKgCents);
  const amount = (cents: number) =>
    interpolate(t('market.price.symbol'), { amount: formatEuros(cents, locale) });

  return (
    <Screen
      eyebrow={t('market.eyebrow.order')}
      onBack={onBack}
      title={t('market.order.form.title')}
    >
      <View className="w-full gap-section">
        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <AppText variant="sectionHeading">{item.name}</AppText>
          <AppText tone="muted" variant="caption">
            {interpolate(t('market.order.by'), {
              seller: item.seller.name,
              date: formatLongDate(item.harvestedOn, locale),
            })}
          </AppText>
          <AppText tone="muted" variant="caption">
            {interpolate(t('market.listing.stock'), {
              species: listingUnitPrice(item, locale, t),
              available: String(item.availableKg),
            })}
          </AppText>
        </Card>

        <FormField
          inputMode="decimal"
          keyboardType="decimal-pad"
          label={t('market.order.form.kilograms')}
          onChangeText={setKilogramsText}
          placeholder="2"
          testID="market-order-kilograms"
          value={kilogramsText}
        />
        {kilogramsText !== '' && kilograms === null ? (
          <StatusMessage testID="market-order-kilograms-invalid" tone="danger" variant="caption">
            {interpolate(t('market.order.form.kilogramsInvalid'), {
              available: String(item.availableKg),
            })}
          </StatusMessage>
        ) : null}

        <FormField
          label={interpolate(t('market.order.form.pickup'), { window: item.pickup.window })}
          onChangeText={setPickupText}
          placeholder="18:30"
          testID="market-order-pickup"
          value={pickup}
        />
        {pickupValid ? null : (
          <StatusMessage testID="market-order-pickup-invalid" tone="danger" variant="caption">
            {t('market.order.form.pickupInvalid')}
          </StatusMessage>
        )}

        {subtotal !== null ? (
          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} variant="sectionHeading">
              {t('market.order.total')}
            </AppText>
            <AppText tone="accent" variant="priceTotal" testID="market-order-preview-total">
              {amount(subtotal)}
            </AppText>
          </View>
        ) : null}

        <AppButton
          disabled={kilograms === null || !pickupValid || place.isPending}
          icon={<Feather color={colors.onAccent} name="shopping-bag" size={20} />}
          label={t(place.isPending ? 'market.order.form.placing' : 'market.order.form.place')}
          onPress={() => {
            if (kilograms !== null && pickupValid) place.mutate({ kilograms, pickup });
          }}
          testID="market-order-place"
        />
        {place.isError ? (
          <StatusMessage testID="market-order-failed" tone="danger" variant="bodySmall">
            {t('market.order.form.failed')}
          </StatusMessage>
        ) : null}

        <AppText tone="muted" variant="metadata">
          {t('market.listing.escrow')}
        </AppText>
      </View>
    </Screen>
  );
}

function OrderSummary({
  orderId,
  marketApi,
  onBack,
  onMessageSeller,
}: MarketOrderScreenProps & { orderId: string }) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const query = useQuery({
    queryKey: ['market', 'order', orderId],
    queryFn: () => marketApi.order(orderId),
    retry: false,
  });
  const order: MarketOrder | undefined = query.data;

  if (!order) {
    return (
      <Screen eyebrow={t('market.eyebrow.order')} onBack={onBack} title={t('market.order.title')}>
        <StatusMessage
          testID="market-order-status"
          tone={query.isError ? 'danger' : 'muted'}
          variant="bodySmall"
        >
          {t(query.isError ? 'market.readFailed' : 'common.loading')}
        </StatusMessage>
      </Screen>
    );
  }

  const { listing } = order;
  const amount = (cents: number) =>
    interpolate(t('market.price.symbol'), { amount: formatEuros(cents, locale) });

  return (
    <Screen eyebrow={t('market.eyebrow.order')} onBack={onBack} title={t('market.order.title')}>
      <View className="w-full gap-section">
        <Callout
          icon={<Feather color={colors.success} name="check-circle" size={20} />}
          testID="market-order-confirmed"
          title={t(STATUS_KEY[order.status])}
          tone="success"
        >
          {t('market.order.confirmed.body')}
        </Callout>

        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <AppText variant="sectionHeading">{listing.name}</AppText>
          <AppText tone="muted" variant="caption">
            {interpolate(t('market.order.by'), {
              seller: listing.seller.name,
              date: formatLongDate(listing.harvestedOn, locale),
            })}
          </AppText>

          <Divider />

          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} variant="message">
              {interpolate(t('market.order.line'), {
                kilograms: String(order.kilograms),
                unit: interpolate(t('market.listing.price'), {
                  amount: formatEuros(order.pricePerKgCents, locale),
                }),
              })}
            </AppText>
            <AppText variant="cardLead">{amount(order.subtotalCents)}</AppText>
          </View>

          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} tone="muted" variant="bodySmall">
              {t('market.order.delivery')}
            </AppText>
            <AppText tone="muted" variant="bodySmall">
              {amount(order.deliveryCents)}
            </AppText>
          </View>

          <Divider />

          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} variant="sectionHeading">
              {t('market.order.total')}
            </AppText>
            <AppText tone="accent" variant="priceTotal" testID="market-order-total">
              {amount(order.totalCents)}
            </AppText>
          </View>
        </Card>

        <View className="w-full flex-row items-center gap-gap">
          <Feather color={colors.accent} name="map-pin" size={22} />
          <View className="flex-1 gap-tight">
            <AppText variant="cardLead">
              {interpolate(t('market.order.pickup.title'), { name: listing.seller.name })}
            </AppText>
            <AppText tone="muted" variant="caption">
              {interpolate(t('market.order.pickup.meta'), {
                time: order.pickupTime,
                place: listing.pickup.place,
                town: listing.place.town,
              })}
            </AppText>
          </View>
        </View>

        {onMessageSeller ? (
          <AppButton
            icon={<Feather color={colors.accent} name="message-circle" size={20} />}
            label={interpolate(t('market.order.message'), { name: listing.seller.name })}
            onPress={() => onMessageSeller(listing.id)}
            testID="market-order-message"
            variant="secondary"
          />
        ) : null}
      </View>
    </Screen>
  );
}
