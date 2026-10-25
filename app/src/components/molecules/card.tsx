import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from '../atoms';

export type CardProps = ViewProps & {
  /** Optional heading rendered with the card's own typography. */
  title?: string;
  footer?: ReactNode;
};

/** Surface container used to group related content. */
export function Card({ title, footer, children, style, ...rest }: CardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      {...rest}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {title ? (
        <AppText variant="subtitle" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
    width: '100%',
  },
  title: {
    marginBottom: spacing.xs,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
