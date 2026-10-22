import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, CodeField, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { appEnvironment, type AppEnvironment } from '@/config/env';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';
import type { IdentifierKind } from '@/utils/identifier';

import {
  CODE_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  formatCountdown,
  isCodeComplete,
} from '../domain/verification';
import { useCountdown } from '../hooks/use-countdown';

export type OnboardingVerificationScreenProps = {
  /**
   * The destination the code belongs to — an address or a number. The frame's supporting line
   * names it rather than hiding it, and the screen names it without claiming a delivery (ADR-048).
   */
  destination: string;
  /**
   * Which of the two identifiers that destination is, because the frame draws one state of the
   * screen and screen 03 offers two (`identifierKind`, `src/utils/identifier.ts`).
   *
   * It is **passed in rather than derived from `destination`**: the branch's fact is a fact about
   * the journey and the destination, and the route is where the flow's own record is read
   * (ADR-049 §3, which also records what the branch may become — the journey, or the transport that
   * answered — if the owner answers differently).
   */
  destinationKind: IdentifierKind;
  onBack?: () => void;
  /** The frame's “Change email address”, which in this flow leads back to the form. */
  onChangeDestination?: () => void;
  /**
   * Whoever can send a new code. It is what decides whether the frame's resend row is drawn at
   * all: asking for another code **is** the row's whole meaning, so a caller that cannot send one
   * leaves it out rather than drawing a control that cannot act (AGENTS.md §11.2). The app's own
   * route supplies none today — no account service and no transport to carry a code.
   */
  onResend?: () => void;
  /**
   * Hands the completed code to whoever can answer the question the screen cannot: “is this the
   * code we sent?”. It resolves `true` when the credential was accepted and the flow continues,
   * and `false` when it was refused — which is what the screen reports in its failure line.
   *
   * The screen deliberately does **not** ask the session seam itself: whether a credential is
   * one the app can accept is authorisation's question, and the answer has to come from behind
   * the account service's port rather than from a component (ARCHITECTURE.md §3.2). The route
   * above wires this to that port.
   *
   * One failure state, deliberately: a refusal and a session the app could not keep are the same
   * line here, because the design draws no error treatment at all and PROJECT.md's open question
   * 11 has not answered what the screen must distinguish. What the seam knows about *why* is
   * kept in its own result for the screens that get built against it next.
   */
  onSubmitCode?: (code: string) => Promise<boolean>;
  /**
   * The environment this build was made for, which decides whether a code can be accepted at
   * all. Read from `src/config/env.ts` — the one module allowed to read `EXPO_PUBLIC_*` — and
   * passable so a test can state which build it is testing.
   */
  environment?: AppEnvironment;
};

/**
 * Screen 04 · Onboarding · Verification (Figma node 5:22840).
 *
 * Composition, copy and metrics come from that frame: the back control and screen title,
 * the 76 px symbol tile, the heading, the supporting line naming the address, the
 * six-cell code field with its expiry note, the 54 px action, the resend action the frame
 * draws mid-wait, the change-address action and the accent-tinted note about the phone
 * path.
 *
 * The copy says what the step is for and names the destination the code belongs to, rather than
 * repeating the frame's “Check your inbox” and “the code we sent”: nothing here sends one, and the
 * frame's own words come back whole in the branch where a transport does (ADR-048 — the decision
 * records the wording for the email and the SMS branch).
 *
 * **The frame draws one state, and the flow has two.** Screen 03 and the sign-in screen take an
 * address or a number (ADR-034 §1.2), so the two strings that name the account's identifier — the
 * screen's title and the action back to the field — follow the destination, and the frame's foot
 * card (which asks whether the reader signed up by phone *instead*) is drawn on the email journey
 * only. Both are the **assumed** answers to the first two of [ADR-049](../../../../docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md)'s
 * §3 slots, recorded there on 2026-10-13 with the departure from the frame; the owner's answer
 * supersedes them. Which state the screen is in is passed in (`destinationKind`) rather than
 * derived here, so the day the answer makes the branch the journey or the transport, only the
 * caller changes.
 *
 * One thing the departure does not touch: the 36 px tile is still the frame's `mail-check` glyph on
 * both states, because choosing another one is a drawing rather than a wording, and the design file
 * has no phone frame to take it from (ADR-049 §1.2, PROJECT.md open question 20).
 *
 * One thing the frame does not settle, recorded in PROJECT.md: how long the resend wait runs (the
 * frame catches one in progress at `00:28`).
 *
 * The frame also draws an OS status bar and a home indicator; those belong to the device,
 * so they are deliberately not part of the screen.
 *
 * One thing the screen has that the design does not: a **failure** line under the action,
 * written app-side like the other screens' `saveFailed` lines, because a code this app had to
 * refuse must not leave the press silent (AGENTS.md §2.3). And two things it deliberately does
 * **not** have: a production build wires no verification at all — there is no service to ask, so the
 * action stays inert rather than standing in for an answer nobody gave — and the frame's resend row
 * is absent until a caller can send a code, because asking for another one is the row's whole
 * meaning (ADR-048).
 *
 * Where the code is judged is no longer here: the screen collects it and hands it to
 * `onSubmitCode`, because whether a credential is one the app can accept belongs to the account
 * service's port and not to a component (`src/services/session/`, ADR-027). What this screen
 * still owns is everything a user touches — the field, the failure line, the countdown, and the
 * environment that decides whether its action can act at all.
 */
export function OnboardingVerificationScreen({
  destination,
  destinationKind,
  onBack,
  onChangeDestination,
  onResend,
  onSubmitCode,
  environment,
}: OnboardingVerificationScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  // The frame draws the email state and screen 03 offers both identifiers, so the two strings that
  // name the account's identifier follow the destination the code is for (ADR-049 §3.1–§3.2).
  const phone = destinationKind === 'phone';
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  // The wait paces a resend, so it only runs where one can be sent: no transport, no countdown.
  const [secondsUntilResend, restartResendWait] = useCountdown(
    onResend === undefined ? 0 : RESEND_COOLDOWN_SECONDS,
  );

  const buildEnvironment = environment ?? appEnvironment();
  // Nothing can check a code in a shipped build, so its action cannot act (AGENTS.md §11.2).
  const canVerify = buildEnvironment !== 'production';

  const submit = async () => {
    if (onSubmitCode === undefined) {
      return;
    }

    setSubmitting(true);

    try {
      setVerificationFailed(!(await onSubmitCode(code)));
    } catch {
      // The seam rejects only when the session could not be kept, and that is never a success:
      // the screen says the code did not get through rather than moving on without a session.
      setVerificationFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow={t('onboarding.verification.eyebrow')}
      onBack={onBack}
      title={t(phone ? 'onboarding.verification.titlePhone' : 'onboarding.verification.title')}
    >
      <View className="w-full gap-section">
        {
          // The frame's 76 px tile with its 36 px mail-check glyph; the design draws its
          // icons as vectors, so this is the nearest glyph from `@expo/vector-icons`
          // (PROJECT.md).
        }
        <View
          className="items-center justify-center rounded-lg"
          style={{
            backgroundColor: colors.accentMuted,
            height: layout.symbolTile,
            width: layout.symbolTile,
          }}
          testID="verification-symbol"
        >
          <MaterialCommunityIcons color={colors.accent} name="email-check" size={36} />
        </View>

        <AppText variant="title">{t('onboarding.verification.heading')}</AppText>

        <AppText tone="muted" variant="bodySmall">
          {interpolate(t('onboarding.verification.supporting'), { destination })}
        </AppText>

        <CodeField
          label={t('onboarding.verification.codeLabel')}
          length={CODE_LENGTH}
          onChangeText={(next) => {
            setCode(next);
            // The message belongs to the code that was refused: typing over it takes it away.
            setVerificationFailed(false);
          }}
          testID="verification-code"
          value={code}
        />

        <AppText tone="muted" variant="bodySmall">
          {t('onboarding.verification.expiry')}
        </AppText>

        <AppButton
          // An action that cannot act claims no role: no handler, nothing it could check, or a
          // submission already in flight all leave the frame's action inert (AGENTS.md §11.2).
          disabled={!isCodeComplete(code) || !canVerify || onSubmitCode === undefined || submitting}
          label={t('onboarding.verification.action')}
          onPress={() => void submit()}
          testID="verification-action"
        />

        {verificationFailed ? (
          <AppText testID="verification-verify-failed" tone="danger" variant="bodySmall">
            {t('onboarding.verification.verifyFailed')}
          </AppText>
        ) : null}

        {onResend !== undefined &&
          (secondsUntilResend === 0 ? (
            <TextAction
              align="center"
              label={t('onboarding.verification.resend')}
              // The wait starts again the moment a new code is asked for; a resend that
              // failed would need it reset to zero, which there is no API to report yet.
              onPress={() => {
                onResend();
                restartResendWait();
              }}
              testID="verification-resend"
            />
          ) : (
            // While the wait runs the frame's own state: the action says how long is left
            // and cannot act, so it is copy rather than a button (see `TextAction`). The row
            // wraps because at the largest system text size the sentence and the countdown
            // no longer share a line (ADR-019).
            <View className="w-full flex-row flex-wrap items-center justify-center gap-xs">
              <AppText style={{ fontWeight: '600' }} tone="accent" variant="bodySmall">
                {t('onboarding.verification.resendWaiting')}
              </AppText>
              {
                // A number is not translated and not a sentence: the copy stops before it,
                // so the countdown is written here rather than kept in the catalogue.
              }
              <AppText
                style={{ fontWeight: '600' }}
                testID="verification-resend-countdown"
                tone="accent"
                variant="bodySmall"
              >
                {formatCountdown(secondsUntilResend)}
              </AppText>
            </View>
          ))}

        <TextAction
          align="center"
          label={t(
            phone ? 'onboarding.verification.changePhone' : 'onboarding.verification.changeEmail',
          )}
          onPress={onChangeDestination}
          testID="verification-change-destination"
        />

        {
          // The frame's card at the foot asks whether the reader signed up by phone **instead**,
          // which is a question for the journey that did not: on a phone destination it would ask
          // the picker about themselves (ADR-049 §3.3).
          phone ? null : (
            <Callout
              icon={<Feather color={colors.accent} name="smartphone" size={20} />}
              testID="verification-phone-note"
              title={t('onboarding.verification.phoneNote.title')}
              tone="accent"
            >
              {t('onboarding.verification.phoneNote.body')}
            </Callout>
          )
        }
      </View>
    </Screen>
  );
}
