import { Feather } from '@/components/atoms/app-icon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppButton, AppText, AppTextInput } from '@/components/atoms';
import { Card, StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatLongDate, interpolate, useTranslation } from '@/services/i18n';

import type { ChatMessage } from '../domain/chat';
import type { MarketApi } from '../services/market-api';
import { listingUnitPrice } from './listing-copy';

export type MarketChatScreenProps = {
  listingId?: string;
  marketApi: Pick<MarketApi, 'listing' | 'thread' | 'send'>;
  onBack?: () => void;
  onOpenOrder?: (listingId: string) => void;
};

/** How often an open thread asks for new messages, in milliseconds. */
const THREAD_REFRESH_MS = 15_000;

/**
 * Screen 17 · Marketplace · Seller chat (Figma node `5:23880`): the thread between this buyer and
 * the listing's seller (`/market/listings/:id/messages`), refreshed while it is open, with a
 * composer that sends for real. Each bubble's accessible name says who wrote it, because a side is
 * not something a screen reader hears.
 */
export function MarketChatScreen({
  listingId,
  marketApi,
  onBack,
  onOpenOrder,
}: MarketChatScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const enabled = listingId !== undefined;
  const listing = useQuery({
    queryKey: ['market', 'listing', listingId],
    queryFn: () => marketApi.listing(listingId!),
    enabled,
    retry: false,
  });
  const thread = useQuery({
    queryKey: ['market', 'thread', listingId],
    queryFn: () => marketApi.thread(listingId!),
    enabled,
    retry: false,
    refetchInterval: THREAD_REFRESH_MS,
  });
  const send = useMutation({
    mutationFn: (body: string) => marketApi.send(listingId!, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['market', 'thread', listingId], updated);
      setDraft('');
    },
  });

  const authorName = (message: ChatMessage) =>
    message.mine ? t('market.chat.author.picker') : t('market.chat.author.seller');
  const text = draft.trim();
  const title = thread.data?.sellerName || listing.data?.seller.name || t('market.eyebrow.chat');

  return (
    <Screen eyebrow={t('market.eyebrow.chat')} onBack={onBack} title={title}>
      <View className="w-full gap-section">
        {listing.data ? (
          <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
            <View className="w-full flex-row items-center gap-gap">
              <Feather color={colors.accent} name="shopping-bag" size={22} />
              <View className="flex-1 gap-tight">
                <AppText variant="cardLead">
                  {interpolate(t('market.chat.listing'), {
                    name: listing.data.name,
                    price: listingUnitPrice(listing.data, locale, t),
                  })}
                </AppText>
                <AppText tone="muted" variant="metadata">
                  {interpolate(t('market.chat.listingMeta'), {
                    available: String(listing.data.availableKg),
                    place: listing.data.place.area,
                  })}
                </AppText>
              </View>
            </View>
          </Card>
        ) : null}

        {!thread.data ? (
          <StatusMessage
            testID="market-chat-status"
            tone={thread.isError ? 'danger' : 'muted'}
            variant="bodySmall"
          >
            {t(
              !enabled
                ? 'market.listing.unknown'
                : thread.isError
                  ? 'market.readFailed'
                  : 'common.loading',
            )}
          </StatusMessage>
        ) : thread.data.messages.length === 0 ? (
          <AppText testID="market-chat-empty" tone="muted" variant="bodySmall">
            {t('market.chat.empty')}
          </AppText>
        ) : (
          <View className="w-full gap-gap">
            {thread.data.messages.map((message) => {
              const mine = message.mine;
              const time = new Date(message.sentAt).toLocaleTimeString(
                locale === 'fi' ? 'fi-FI' : 'en-GB',
                { hour: '2-digit', minute: '2-digit' },
              );

              return (
                <View
                  className="w-full gap-tight"
                  key={message.id}
                  style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}
                  testID={`market-chat-${message.id}`}
                >
                  <View
                    accessibilityLabel={interpolate(t('market.chat.messageA11y'), {
                      author: authorName(message),
                      text: message.body,
                    })}
                    accessible
                    className="rounded-lg px-field py-field"
                    style={{
                      backgroundColor: mine ? colors.accent : colors.surface,
                      borderColor: colors.border,
                      borderWidth: mine ? 0 : 1,
                      maxWidth: layout.messageBubbleMaxWidth,
                    }}
                  >
                    <AppText
                      style={{ color: mine ? colors.onAccent : colors.text }}
                      variant="message"
                    >
                      {message.body}
                    </AppText>
                  </View>
                  <AppText tone="muted" variant="messageMeta">
                    {`${formatLongDate(message.sentAt, locale)} ${time}${
                      mine && message.read ? ` · ${t('market.chat.read')}` : ''
                    }`}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}

        {onOpenOrder && listingId && listing.data?.status === 'active' ? (
          <AppButton
            icon={<Feather color={colors.accent} name="file-text" size={20} />}
            label={t('market.listing.order')}
            onPress={() => onOpenOrder(listingId)}
            testID="market-chat-order"
            variant="secondary"
          />
        ) : null}

        {enabled ? (
          <View className="w-full flex-row items-center gap-gap" testID="market-chat-composer">
            <View className="flex-1">
              <AppTextInput
                accessibilityLabel={t('market.chat.composer')}
                maxLength={1000}
                onChangeText={setDraft}
                placeholder={t('market.chat.composer')}
                testID="market-chat-input"
                value={draft}
              />
            </View>
            <Pressable
              accessibilityLabel={t('market.chat.send')}
              accessibilityRole="button"
              accessibilityState={{ disabled: text === '' || send.isPending }}
              disabled={text === '' || send.isPending}
              hitSlop={8}
              onPress={() => send.mutate(text)}
              testID="market-chat-send"
            >
              <Feather
                color={text === '' ? colors.textMuted : colors.accent}
                name="send"
                size={24}
              />
            </Pressable>
          </View>
        ) : null}
        {send.isError ? (
          <StatusMessage testID="market-chat-send-failed" tone="danger" variant="caption">
            {t('market.chat.sendFailed')}
          </StatusMessage>
        ) : null}
      </View>
    </Screen>
  );
}
