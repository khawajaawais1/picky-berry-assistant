import { useState } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing, radii } from '@/constants/theme';
import { useTranslation } from '@/services/i18n';

import { AppButton, AppText } from '../atoms';
import { StatusMessage } from './status-message';
import { TextAction } from './text-action';

export type SignOutActionProps = {
  /**
   * Leaves: deletes what this device holds of the picker's and drops the session
   * (`src/services/sign-out.ts`). The caller owns where the user goes on success.
   */
  onSignOut: () => Promise<void>;
  testID?: string;
};

/**
 * Signing out, with the deletion stated before it happens.
 *
 * The service deletes the saved plan, the reports waiting to sync and the consent record, then
 * drops the session. The first three live only on this phone until a transport exists, so one
 * unconfirmed tap was able to destroy the only copy of a day's reports (frontend review,
 * 2026-10-25). The control therefore opens a confirmation that names every record, and the
 * confirmation stays put — with a live-region failure — when the deletion did not finish.
 *
 * It is shared by the profile and the account screen because it is one rule about leaving, not a
 * screen's own decoration: two drawings of it could disagree about what a press costs.
 */
export function SignOutAction({ onSignOut, testID = 'sign-out' }: SignOutActionProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = () => {
    setFailed(false);
    setConfirming(true);
  };

  const cancel = () => {
    if (working) {
      return;
    }

    setFailed(false);
    setConfirming(false);
  };

  const confirm = async () => {
    if (working) {
      return;
    }

    setWorking(true);
    setFailed(false);

    try {
      await onSignOut();
    } catch {
      // The service drops the session last, so a failure leaves the user signed in — and may have
      // removed some of the records already. The line says that rather than claiming nothing went.
      setFailed(true);
    } finally {
      setWorking(false);
    }
  };

  if (!confirming) {
    return (
      <TextAction align="center" label={t('privacy.signOut')} onPress={open} testID={testID} />
    );
  }

  return (
    <View
      className="w-full"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        gap: spacing.gap,
        padding: spacing.section,
      }}
      testID={`${testID}-confirm`}
    >
      <StatusMessage variant="cardTitle">{t('privacy.signOut.confirm.title')}</StatusMessage>

      <AppText tone="muted" variant="bodySmall">
        {t('privacy.signOut.confirm.body')}
      </AppText>

      {failed ? (
        <StatusMessage tone="danger" variant="caption">
          {t('privacy.signOut.failed')}
        </StatusMessage>
      ) : null}

      <AppButton
        busy={working}
        label={t('privacy.signOut.confirm.action')}
        onPress={() => void confirm()}
        testID={`${testID}-confirm-action`}
      />

      <TextAction
        align="center"
        label={t('privacy.signOut.confirm.cancel')}
        onPress={working ? undefined : cancel}
        testID={`${testID}-cancel`}
      />
    </View>
  );
}
