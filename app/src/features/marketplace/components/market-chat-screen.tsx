import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Card } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatLongDate, interpolate, useTranslation } from '@/services/i18n';

import { DEMO_THREAD, type ChatMessage } from '../domain/chat';
import { DEMO_LISTING, DEMO_LISTING_DETAIL } from '../domain/listing';
import { formatEuros } from '../domain/money';
import { DEMO_ORDER, orderTotalCents } from '../domain/order';
import { listingUnitPrice } from './listing-copy';
import { MarketDisclosure } from './market-disclosure';

export type MarketChatScreenProps = {
  onBack?: () => void;
  /** Opens the order the thread is about (frame 18), or nothing. */
  onOpenOrder?: () => void;
};

/**
 * Screen 17 · Planned marketplace · Seller chat (Figma node `5:23883`).
 *
 * The design's thread with one seller: the listing being talked about, the day, the four messages
 * the frame draws, and the two controls under them — the summary of the order being agreed and the
 * composer a message would be written in.
 *
 * **Nothing is sent or received.** There is no chat transport, no seller and no message store, so
 * the thread is the design's own sample exchange (`DEMO_THREAD`, whose words are the catalogue's)
 * and the screen says so with the frame's own disclosure above it. Two things follow from that, and
 * both are recorded in PROJECT.md:
 *
 * - the frame's **composer claims no role**. It is drawn exactly as the frame draws it, with its
 *   own placeholder, and it is not a text field: a field that swallowed what a picker typed, with a
 *   send control that delivered it nowhere, would be a worse lie than a row that plainly is not an
 *   input;
 * - the frame's **order summary** opens frame 18, which is the one thing in this thread that leads
 *   somewhere — so it is a real action, and a route that has no order to open draws none.
 *
 * The date over the thread is the listing's own harvest day, because the design's thread is about
 * that day: “28 AUGUST 2026”, upper-cased by the style rather than by the catalogue, so both
 * languages keep their own date form (ADR-017).
 */
export function MarketChatScreen({ onBack, onOpenOrder }: MarketChatScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();

  const listing = DEMO_LISTING;
  const total = interpolate(t('market.chat.summary'), {
    total: formatEuros(orderTotalCents(DEMO_ORDER, listing), locale),
  });

  const authorName = (message: ChatMessage) =>
    message.author === 'picker' ? t('market.chat.author.picker') : t('market.chat.author.seller');

  const messageText = (message: ChatMessage) =>
    t(
      message.id === 'ask'
        ? 'market.chat.ask'
        : message.id === 'reply'
          ? 'market.chat.reply'
          : message.id === 'confirm'
            ? 'market.chat.confirm'
            : 'market.chat.pack',
    );

  return (
    <Screen
      edges={['top']}
      eyebrow={t('market.eyebrow.chat')}
      onBack={onBack}
      title={listing.seller.name}
    >
      <View className="w-full gap-section">
        <MarketDisclosure>
          {listing.seller.verified ? (
            <View className="flex-row items-center gap-sm">
              <Feather
                color={colors.success}
                name="check-circle"
                size={22}
                testID="market-chat-verified"
              />
              <AppText tone="success" variant="metadata">
                {t('market.seller.badge')}
              </AppText>
            </View>
          ) : null}
        </MarketDisclosure>

        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="shopping-bag" size={22} />
            <View className="flex-1 gap-tight">
              <AppText variant="cardLead">
                {interpolate(t('market.chat.listing'), {
                  name: listing.name,
                  price: listingUnitPrice(listing, locale, t),
                })}
              </AppText>
              <AppText tone="muted" variant="metadata">
                {interpolate(t('market.chat.listingMeta'), {
                  available: String(listing.availableKg),
                  place: listing.place.area,
                })}
              </AppText>
            </View>
          </View>
        </Card>

        <AppText
          style={{ textAlign: 'center', textTransform: 'uppercase' }}
          tone="muted"
          variant="metadata"
        >
          {interpolate(t('market.chat.stamp'), {
            date: formatLongDate(DEMO_LISTING_DETAIL.harvestedOn, locale),
          })}
        </AppText>

        <View className="w-full gap-gap">
          {DEMO_THREAD.map((message) => {
            const fromPicker = message.author === 'picker';
            const text = messageText(message);

            return (
              <View
                className="w-full gap-tight"
                key={message.id}
                style={{ alignItems: fromPicker ? 'flex-end' : 'flex-start' }}
                testID={`market-chat-${message.id}`}
              >
                {/* The bubble's own side says who wrote it, and a side is a position — which is
                    not a signal a screen reader hears. The bubble therefore carries an accessible
                    name naming the author, so the thread does not depend on alignment alone
                    (AGENTS.md §11.2). */}
                <View
                  accessibilityLabel={interpolate(t('market.chat.messageA11y'), {
                    author: authorName(message),
                    text,
                  })}
                  accessible
                  className="rounded-lg px-field py-field"
                  style={{
                    backgroundColor: fromPicker ? colors.accent : colors.surface,
                    borderColor: colors.border,
                    borderWidth: fromPicker ? 0 : 1,
                    maxWidth: layout.messageBubbleMaxWidth,
                  }}
                >
                  <AppText
                    style={{ color: fromPicker ? colors.onAccent : colors.text }}
                    variant="message"
                  >
                    {text}
                  </AppText>
                </View>
                <AppText tone="muted" variant="messageMeta">
                  {message.read ? `${message.time} · ${t('market.chat.read')}` : message.time}
                </AppText>
              </View>
            );
          })}
        </View>

        {onOpenOrder ? (
          <AppButton
            icon={<Feather color={colors.accent} name="file-text" size={20} />}
            label={total}
            onPress={onOpenOrder}
            testID="market-chat-summary"
            variant="secondary"
          />
        ) : null}

        {/* The frame's composer, drawn and inert: no message is delivered anywhere, so it claims
            no input role and holds no value. */}
        <View
          className="w-full flex-row items-center gap-gap rounded-pill px-field py-field"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
          testID="market-chat-composer"
        >
          <Feather color={colors.accent} name="plus" size={22} />
          <AppText style={{ flex: 1 }} tone="muted" variant="bodySmall">
            {t('market.chat.composer')}
          </AppText>
          <Feather color={colors.accent} name="send" size={22} />
        </View>
      </View>
    </Screen>
  );
}
