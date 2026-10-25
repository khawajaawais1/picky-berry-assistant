import { ScrollView, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { StatusMessage, TextAction } from '@/components/molecules';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

export type ErrorScreenProps = {
  /** The thrown error. Deliberately not rendered: a message is not copy. */
  error: Error;
  onHome: () => void;
  /** The router's own reset, when it offered one. */
  onRetry?: () => void | Promise<void>;
};

/**
 * The screen a route falls back to when it throws while rendering.
 *
 * A shipped app has no error boundary of its own, so a render error fell through to the router's
 * default — a blank frame with no way on. This is app-drawn (no frame exists for a failure), and
 * it says the two things a user needs: the data on the phone is untouched, and there is a way
 * out. It deliberately draws **no** error text; a thrown message can carry a path, an address or
 * a store key (frontend review, 2026-10-25).
 *
 * It uses a plain `View` rather than the `Screen` template: a boundary may be rendered outside the
 * providers the template expects (safe area, navigation), and a fallback that requires them can
 * fail on the screen it is meant to rescue.
 */
export function ErrorScreen({ onHome, onRetry }: ErrorScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.section,
          justifyContent: 'center',
          padding: spacing.section,
        }}
      >
        <AppText tone="accent" variant="chip">
          {t('error.eyebrow')}
        </AppText>

        <AppText accessibilityRole="header" variant="title">
          {t('error.title')}
        </AppText>

        <StatusMessage tone="muted" variant="bodySmall">
          {t('error.body')}
        </StatusMessage>

        {onRetry ? (
          <AppButton label={t('error.retry')} onPress={() => void onRetry()} testID="error-retry" />
        ) : null}

        <TextAction align="center" label={t('error.home')} onPress={onHome} testID="error-home" />
      </ScrollView>
    </View>
  );
}
