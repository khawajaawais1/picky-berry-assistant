import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';

import { AppText, type AppTextTone } from '../atoms';

export type InfoRowProps = {
  label: string;
  value: string;
  /** Optional secondary line: explains why the value matters. */
  hint?: string;
  valueTone?: AppTextTone;
  hintTone?: AppTextTone;
  /** Render the value in a monospace face (URLs, identifiers, versions). */
  monospace?: boolean;
};

/** Labelled read-only field: the standard way to present a key/value pair. */
export function InfoRow({
  label,
  value,
  hint,
  valueTone = 'default',
  hintTone = 'muted',
  monospace = false,
}: InfoRowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant={monospace ? 'code' : 'body'} tone={valueTone}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone={hintTone}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    width: '100%',
  },
});
