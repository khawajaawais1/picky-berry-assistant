import { Feather, MaterialCommunityIcons } from '@/components/atoms/app-icon';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { ChoiceChips, FormField, TextAction } from '@/components/molecules';
import {
  PrototypeSwitcher,
  type PrototypeVariant,
} from '@/components/prototype/prototype-switcher';
import { Screen } from '@/components/templates';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * PROTOTYPE — throwaway code, not a screen.
 *
 * **The question:** what should the sign-in screen look like? The design file has no frame for it
 * (frames 01–18 contain none), so this is the paper the designer reacts to instead of answering
 * [to-questionnaire-sign-in.md](../../../../../to-questionnaire-sign-in.md) §1 in the abstract — and
 * it makes the first question in that section concrete: all three variants are a **second reading of
 * the flow**, mounted on the existing `/create-account` route, so the designer can see whether
 * signing in is its own frame or a mode of frame 03.
 *
 * **The plan:** three variants on the existing `/create-account` route, switchable with `?variant=`
 * and the floating bar. Variant A "Code first" builds on the six-cell code screen that already
 * exists. Variant B "Dense form" keeps everything on one screen with a mode switch and a password.
 * Variant C "Device first" leads with the device knowing the user (biometric, last-used address) and
 * hides the form behind it. They disagree about structure, not colour.
 *
 * Two things this file deliberately does *not* do: it does not add copy to the catalogue (these
 * strings are hard-coded English, because a prototype's wording is not a translation anyone should
 * review), and it does not touch the account service (there is none — every action reports what the
 * real screen would do, and the bar shows that in the note line).
 *
 * Delete this folder and `src/components/prototype/` when the design question is answered; the
 * variant that wins is rewritten properly on its own frame.
 */

export type SignInVariantKey = 'A' | 'B' | 'C';

export const SIGN_IN_VARIANTS: readonly PrototypeVariant[] = [
  { key: 'A', name: 'Code first' },
  { key: 'B', name: 'Dense form' },
  { key: 'C', name: 'Device first' },
];

/** True for a `?variant=` value this prototype knows. */
export function isSignInVariantKey(value: string | undefined): value is SignInVariantKey {
  return SIGN_IN_VARIANTS.some((variant) => variant.key === value);
}

type Action = () => void;

type VariantProps = {
  /** Where “I don’t have an account” would go: screen 03, which exists. */
  onCreateAccount: Action;
};

/** A — one field, no password: the code screen the app already has does the rest. */
function CodeFirst({ onSendCode, onCreateAccount }: VariantProps & { onSendCode: Action }) {
  const { colors } = useAppTheme();
  const [identifier, setIdentifier] = useState('');

  return (
    <Screen eyebrow="PROTOTYPE · SIGN IN" title="Welcome back">
      <View className="w-full gap-section">
        <View
          className="items-center justify-center rounded-lg"
          style={{
            backgroundColor: colors.accentMuted,
            height: layout.symbolTile,
            width: layout.symbolTile,
          }}
        >
          <Feather color={colors.accent} name="key" size={36} />
        </View>

        <AppText variant="title">Sign in with a code.</AppText>

        <AppText tone="muted" variant="bodySmall">
          We send six digits to your email or phone. No password to remember — and none to leak.
        </AppText>

        <FormField
          autoComplete="email"
          label="Email or phone"
          onChangeText={setIdentifier}
          placeholder="aino@example.fi"
          value={identifier}
        />

        <AppButton
          icon={<Feather color={colors.onAccent} name="send" size={20} />}
          label="Send me a code"
          onPress={onSendCode}
        />

        <AppText tone="muted" variant="caption">
          Proposes the code step ADR-059 retired when the credential became email + password.
        </AppText>

        <TextAction align="center" label="I don’t have an account yet" onPress={onCreateAccount} />
      </View>
    </Screen>
  );
}

/** B — everything on one screen: the identifier mode as chips, a password, and recovery beside it. */
function DenseForm({
  onSignIn,
  onForgotPassword,
  onCreateAccount,
}: VariantProps & { onSignIn: Action; onForgotPassword: Action }) {
  const { colors } = useAppTheme();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState(false);

  return (
    <Screen eyebrow="PROTOTYPE · SIGN IN" title="Sign in">
      <View className="w-full gap-section">
        <ChoiceChips
          label="How you signed up"
          onChange={setMode}
          options={[
            { label: 'Email', value: 'email' },
            { label: 'Phone', value: 'phone' },
          ]}
          value={mode}
        />

        <FormField
          autoComplete={mode === 'email' ? 'email' : 'tel'}
          label={mode === 'email' ? 'Email' : 'Phone number'}
          onChangeText={setIdentifier}
          placeholder={mode === 'email' ? 'aino@example.fi' : '+358 40 123 4567'}
          value={identifier}
        />

        <FormField
          accessory={
            <Pressable
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
              // It acts, so it says what it is: without the role this was a tab stop a reviewer
              // could reach while a browser exposed neither a role nor the label (Chromium ignores
              // `aria-label` on a role-less element), found by the accessibility-tree walk the day
              // it started reading the prototype surfaces (`e2e/accessibility.spec.ts`).
              accessibilityRole="button"
              className="h-touch w-xxl items-center justify-center"
              onPress={() => setRevealed((visible) => !visible)}
            >
              <Feather color={colors.textMuted} name={revealed ? 'eye-off' : 'eye'} size={20} />
            </Pressable>
          }
          autoComplete="current-password"
          label="Password"
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry={!revealed}
          value={password}
        />

        {/* `flex-wrap` for the reason the app's own chip rows wrap (ADR-019): at the largest system
            text size the two labels need more than the column, and a row that keeps them side by
            side cuts one off — measured, and the reason this prototype is now in the layout
            harness (e2e/layout.spec.ts). */}
        <View className="w-full flex-row flex-wrap items-center justify-between gap-sm">
          <TextAction label="Forgot password?" onPress={onForgotPassword} />
          <TextAction label="Create an account" onPress={onCreateAccount} />
        </View>

        <AppButton label="Sign in" onPress={onSignIn} />
      </View>
    </Screen>
  );
}

/** C — the device already knows them: biometric first, the form only if that is not wanted. */
function DeviceFirst({
  onBiometric,
  onSignIn,
  onDifferentAccount,
  onCreateAccount,
}: VariantProps & { onBiometric: Action; onSignIn: Action; onDifferentAccount: Action }) {
  const { colors } = useAppTheme();
  const [password, setPassword] = useState('');
  const [typing, setTyping] = useState(false);

  return (
    <Screen eyebrow="PROTOTYPE · SIGN IN" title="Welcome back">
      <View className="w-full gap-section">
        <View className="w-full items-center gap-tight">
          <View
            className="items-center justify-center rounded-pill"
            style={{
              backgroundColor: colors.accentMuted,
              height: layout.symbolTile,
              width: layout.symbolTile,
            }}
          >
            <Feather color={colors.accent} name="user" size={32} />
          </View>
          <AppText variant="cardLead">aino@example.fi</AppText>
          <AppText tone="muted" variant="caption">
            Last used on this phone
          </AppText>
        </View>

        {
          // Any biometric, not one vendor's: the fingerprint glyph says “something about this
          // body” without naming Face ID, Windows Hello or a sensor this phone may not have.
          // Which one a user meets is the OS's business, and the app never sees it.
        }
        <AppButton
          icon={<MaterialCommunityIcons color={colors.onAccent} name="fingerprint" size={22} />}
          label="Continue with biometrics"
          onPress={onBiometric}
        />

        <AppText tone="muted" variant="caption">
          Fingerprint, Face ID or whatever this phone already uses — the OS does the asking, and the
          app is never told which one it was.
        </AppText>

        {typing ? (
          <View className="w-full gap-section">
            <FormField
              autoComplete="current-password"
              label="Password"
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              value={password}
            />
            <AppButton label="Sign in" onPress={onSignIn} variant="secondary" />
          </View>
        ) : (
          <TextAction
            align="center"
            label="Use my password instead"
            onPress={() => setTyping(true)}
          />
        )}

        <TextAction align="center" label="Use a different account" onPress={onDifferentAccount} />

        <TextAction align="center" label="Create an account" onPress={onCreateAccount} />
      </View>
    </Screen>
  );
}

export type SignInPrototypeProps = {
  variant: SignInVariantKey;
};

/**
 * The three variants behind one route. Each action reports what the real screen would do — the
 * service is not built, so the point of pressing is to see the intended consequence, which the
 * switcher's note line prints.
 */
export function SignInPrototype({ variant }: SignInPrototypeProps) {
  const [note, setNote] = useState<string | null>(null);
  const report = (message: string) => () => setNote(message);

  return (
    <>
      {variant === 'A' ? (
        <CodeFirst
          onCreateAccount={report('“I don’t have an account yet” → screen 03')}
          onSendCode={report('“Send me a code” → screen 04, the code screen that exists')}
        />
      ) : null}

      {variant === 'B' ? (
        <DenseForm
          onCreateAccount={report('“Create an account” → screen 03')}
          onForgotPassword={report('“Forgot password?” → a recovery screen the design has none of')}
          onSignIn={report('“Sign in” → the account service, which does not exist yet')}
        />
      ) : null}

      {variant === 'C' ? (
        <DeviceFirst
          onBiometric={report(
            '“Continue with biometrics” → the OS prompt, whatever this device has (fingerprint, Face ID), behind a device permission',
          )}
          onCreateAccount={report('“Create an account” → screen 03')}
          onDifferentAccount={report(
            '“Use a different account” → the form, with the address cleared',
          )}
          onSignIn={report('“Sign in” → the account service, which does not exist yet')}
        />
      ) : null}

      <PrototypeSwitcher current={variant} note={note ?? undefined} variants={SIGN_IN_VARIANTS} />
    </>
  );
}
