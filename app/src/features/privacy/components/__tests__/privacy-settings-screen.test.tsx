import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { layout, spacing, typography } from '@/constants/theme';
import { readPrivacyConsent, recordPrivacyConsent } from '@/services/privacy-consent';
import { enqueueReport, REPORT_QUEUE_STORAGE_KEY } from '@/services/report-queue';
import { saveZone } from '@/services/saved-zones';
import { sessionPort } from '@/services/session';

import { PrivacySettingsScreen } from '../privacy-settings-screen';

/**
 * Content and metrics come from Figma frame `14 · Account and offline · Profile and privacy`
 * (node 5:23613) — the header, the status message and the “Background visit tracking” row.
 * The strings are written out literally so this test fails if the screen silently changes
 * its copy.
 *
 * This is the screen that keeps screen 05's promise: the row switches off the same stored
 * consent the onboarding row switched on, and a write that did not happen is said out loud.
 */
// The frame's own row label was “Background visit tracking”; the switch withdraws the consent
// screen 05 actually collects, which is tracking while the app is open (ADR-047).
const LABEL = 'Visit tracking while the app is open';
const SAVE_FAILED = 'Your choice could not be saved.';
const ACCOUNT_READ_FAILED = 'Your account could not be read.';
const SIGN_OUT_FAILED = 'Signing out did not finish. Some records may still be here; try again.';

/**
 * The account the app is holding, as screen 03 leaves it behind: the name the sign-up collected
 * and the address it was created with (ADR-029).
 */
async function signedIn(email = 'aino@example.fi') {
  await sessionPort.signIn({
    displayName: 'Aino Korhonen',
    email,
    password: 'berries1234',
  });
}

/** The row's switch, as it is rendered right now: a control is re-read, never held. */
function switchValue(): unknown {
  return screen.getByTestId('privacy-visit-tracking').props.value;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  // The session lives in the process rather than in the storage the tests clear (ADR-028), so
  // every test starts by leaving whatever the last one was holding.
  await sessionPort.signOut();
});

describe('PrivacySettingsScreen', () => {
  it('names a returning account by its identifier, when nothing has named it', async () => {
    // A sign-in collects no name (ADR-034) and there is no account service to answer with the
    // account's own one, so the session records that it has none (ADR-038). The row then names
    // what the app knows — the identifier the code belongs to — and the line under it carries the
    // verification claim alone, rather than printing the same identifier twice.
    await sessionPort.signIn({ email: 'aino@example.fi', password: 'berries1234' });

    await render(<PrivacySettingsScreen />);

    expect(await screen.findByTestId('privacy-account-row')).toBeOnTheScreen();
    expect(screen.getByText('aino@example.fi')).toBeOnTheScreen();
    expect(screen.getByText('Email verified')).toBeOnTheScreen();
    expect(screen.queryByText('aino@example.fi · Email verified')).not.toBeOnTheScreen();
  });

  it('renders the frame’s content', async () => {
    await render(<PrivacySettingsScreen />);

    expect(screen.getByText('ACCOUNT / OFFLINE · YOUR SETTINGS')).toBeOnTheScreen();
    // The frame's own title is “Private by nature”; the owner asked for this to read as the
    // profile whose settings these are (2026-10-22).
    expect(screen.getByText('Profile')).toBeOnTheScreen();
    expect(screen.getByText('GPS trails are never public')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Visibility applies to spots, not your route. Exact tracks are never shown to others.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(LABEL)).toBeOnTheScreen();
    // The control's own accessible name: the row's label is a separate element, so the
    // switch has to carry one (AGENTS.md §11.2).
    expect(screen.getByLabelText(LABEL)).toBeOnTheScreen();
  });

  it('drops the consent without asking, and says so, when the write fails', async () => {
    await recordPrivacyConsent(true);
    // One failing write, and deliberately **no `mockRestore()` afterwards**: restoring a spy
    // over this shared mock resets the mock's own implementation, so every later write in
    // the file would resolve while storing nothing — a green test hiding a broken one.
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    await render(<PrivacySettingsScreen />);
    await waitFor(() => expect(switchValue()).toBe(true));

    await fireEvent(screen.getByTestId('privacy-visit-tracking'), 'valueChange', false);

    // The withdrawal did not reach the device, so the screen must not claim it did: the
    // switch falls back to what is stored, and the failure is reported rather than
    // swallowed.
    await waitFor(() => expect(screen.getByText(SAVE_FAILED)).toBeOnTheScreen());
    expect(switchValue()).toBe(true);
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: true });
  });

  it('shows the recorded consent, and withdraws it when the row is switched off', async () => {
    await recordPrivacyConsent(true);

    await render(<PrivacySettingsScreen />);
    await waitFor(() => expect(switchValue()).toBe(true));

    await fireEvent(screen.getByTestId('privacy-visit-tracking'), 'valueChange', false);

    await waitFor(() => expect(switchValue()).toBe(false));
    // Withdrawal is stored, not merely displayed: the record now states that the consent is
    // off, which is the same record screen 05 reads back.
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: false });
    expect(screen.queryByText(SAVE_FAILED)).not.toBeOnTheScreen();
  });

  it('records a consent switched on here, so both screens write the same record', async () => {
    await render(<PrivacySettingsScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('privacy-visit-tracking').props.disabled).toBe(false),
    );

    await fireEvent(screen.getByTestId('privacy-visit-tracking'), 'valueChange', true);

    await waitFor(() => expect(switchValue()).toBe(true));
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: true });
  });

  it('draws the frame’s setting row metrics', async () => {
    await render(<PrivacySettingsScreen />);

    // Frame 14's `Setting` row: the full content column, padded 6 px top and bottom (the
    // same value on all six rows of the frame, which is what makes it a token), its label
    // 12 px away from the control, at 15/21 semibold. NativeWind resolves a `gap-*` class to
    // the gap's two axes, which is what the style carries.
    expect(screen.getByTestId('privacy-visit-tracking-row')).toHaveStyle({
      columnGap: spacing.gap,
      paddingBottom: spacing.setting,
      paddingTop: spacing.setting,
      rowGap: spacing.gap,
    });
    expect(screen.getByText(LABEL)).toHaveStyle({
      fontSize: typography.cardTitle.fontSize,
      fontWeight: '600',
      lineHeight: typography.cardTitle.lineHeight,
    });
  });

  it('counts the waiting reports on the frame’s own sync row', async () => {
    await enqueueReport({
      amountText: '1.3 kg',
      minutes: 52,
      recordedAt: '2026-08-28T10:55:00.000Z',
      speciesId: 'lingonberry',
      yieldRating: 4,
      zoneId: 'Z14',
    });

    await render(<PrivacySettingsScreen />);

    // Frame 14 prints “1 queued” on this row, and the count is the same queue screen 13 lists.
    expect(screen.getByText('Offline maps & sync')).toBeOnTheScreen();
    expect(await screen.findByText('1 queued')).toBeOnTheScreen();
  });

  it('does not report the queue as zero while it is still being read', async () => {
    // An unanswered read is not a zero: the row printed “0 queued” before the device had
    // answered (frontend review, 2026-10-25).
    const getItem = AsyncStorage.getItem as jest.Mock;
    const original = getItem.getMockImplementation();

    getItem.mockImplementation((key: string) =>
      key === REPORT_QUEUE_STORAGE_KEY
        ? new Promise<string | null>(() => {})
        : (original?.(key) ?? Promise.resolve(null)),
    );

    try {
      await render(<PrivacySettingsScreen />);

      expect(screen.queryByText('0 queued')).not.toBeOnTheScreen();
    } finally {
      getItem.mockImplementation(original);
    }
  });

  it('names a setting by its value as well as its label', async () => {
    // `accessibilityLabel={label}` replaced the row's children, so “Offline maps & sync” was
    // announced without the count that is the row's point (frontend review, 2026-10-25).
    await enqueueReport({
      amountText: '1.3 kg',
      minutes: 52,
      recordedAt: '2026-08-28T10:55:00.000Z',
      speciesId: 'lingonberry',
      yieldRating: 4,
      zoneId: 'Z14',
    });

    await render(<PrivacySettingsScreen onOpenSync={() => {}} />);

    expect(
      await screen.findByRole('button', { name: 'Offline maps & sync, 1 queued' }),
    ).toBeOnTheScreen();
  });

  it('is a reading rather than a control until the route can open the sync centre', async () => {
    const onOpenSync = jest.fn();
    const { rerender } = await render(<PrivacySettingsScreen />);

    // With nowhere to navigate to, the row is drawn as the reading it is: no role, no press.
    expect(screen.getByTestId('privacy-sync-row')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Offline maps & sync/ })).not.toBeOnTheScreen();

    await rerender(<PrivacySettingsScreen onOpenSync={onOpenSync} />);
    await fireEvent.press(screen.getByRole('button', { name: /^Offline maps & sync/ }));

    expect(onOpenSync).toHaveBeenCalledTimes(1);
  });

  it('gives every settings row the 44 px target', async () => {
    // The row is a 21 px line inside 6 px of padding: 33 px, short of the repo's floor.
    await render(<PrivacySettingsScreen onOpenSync={() => {}} />);

    expect(screen.getByTestId('privacy-sync-row')).toHaveStyle({
      minHeight: layout.minTouchTarget,
    });
  });

  it('shows whose settings these are, from the session the app is holding', async () => {
    await signedIn();

    await render(<PrivacySettingsScreen />);

    // Frame 14's account row (nodes 5:23626–5:23631): the monogram, the name screen 03
    // collected, and the identifier the code was sent to with what was verified about it.
    expect(await screen.findByText('Aino Korhonen')).toBeOnTheScreen();
    expect(screen.getByText('AK')).toBeOnTheScreen();
    expect(screen.getByText('aino@example.fi · Email verified')).toBeOnTheScreen();
    // A reading, not a control: there is no profile screen behind it, so it claims no role.
    expect(screen.queryByRole('button', { name: 'Aino Korhonen' })).not.toBeOnTheScreen();
  });

  it('draws no account row while the app is holding no session', async () => {
    await render(<PrivacySettingsScreen />);

    // A cold start holds nothing (the session is a process-length memory), and the screen says
    // nothing about an account rather than drawing an empty one.
    await waitFor(() =>
      expect(screen.getByTestId('privacy-visit-tracking').props.disabled).toBe(false),
    );
    expect(screen.queryByTestId('privacy-account-row')).not.toBeOnTheScreen();
    expect(screen.queryByText('AK')).not.toBeOnTheScreen();
  });

  it('names a phone account as a phone, because that is what was verified', async () => {
    await signedIn('+358 40 123 4567');

    await render(<PrivacySettingsScreen />);

    expect(await screen.findByText('+358 40 123 4567 · Phone verified')).toBeOnTheScreen();
    expect(screen.queryByText('Email verified')).not.toBeOnTheScreen();
  });

  it('says so when the session could not be read, rather than showing no account', async () => {
    // A store that will not answer is not “nobody is signed in”, and the difference is the one
    // thing the user would want to know: the question went unanswered.
    jest
      .spyOn(sessionPort, 'current')
      .mockRejectedValueOnce(new Error('the store will not answer'));

    await render(<PrivacySettingsScreen />);

    expect(await screen.findByText(ACCOUNT_READ_FAILED)).toBeOnTheScreen();
  });

  it('draws the frame’s “Use Picky as” card, with the one role the app has', async () => {
    await render(<PrivacySettingsScreen />);

    expect(screen.getByText('Use Picky as')).toBeOnTheScreen();
    expect(screen.getByText('Picker')).toBeOnTheScreen();
    expect(screen.getByText('Buyer')).toBeOnTheScreen();
    // The frame's own note, which is the same disclosure the marketplace screens carry: buying
    // is a planned extra, not a second mode this account is in (CONTEXT.md, **Buyer**).
    expect(
      screen.getByText('Same account. Buying is a planned marketplace extra.'),
    ).toBeOnTheScreen();
    // Both chips are readings of a state, like frame 15's filter chips: neither can be pressed,
    // so neither claims a role (AGENTS.md §11.2).
    expect(screen.queryByRole('button', { name: 'Picker' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Buyer' })).not.toBeOnTheScreen();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('counts the picker’s plan on the frame’s own saved-spots row', async () => {
    await saveZone('Z14', 'bilberry');
    await saveZone('Z09', 'bilberry');

    await render(<PrivacySettingsScreen />);

    expect(screen.getByText('Saved spots')).toBeOnTheScreen();
    expect(await screen.findByText('2')).toBeOnTheScreen();
    // The frame's own subtitle, under the label and above the count it words (node 5:23644).
    expect(screen.getByText('2 spots · private by default')).toBeOnTheScreen();
    // It is the frame's settings card that holds this row (node 5:23640), not a free-standing
    // block; the rows below the status message are drawn outside it, as the frame draws them.
    expect(
      within(screen.getByTestId('privacy-settings-card')).getByText('Saved spots'),
    ).toBeOnTheScreen();
  });

  it('words a plan of one in the singular, as the language asks', async () => {
    await saveZone('Z14', 'bilberry');

    await render(<PrivacySettingsScreen />);

    // One is the case a plural-only sentence gets wrong: “1 spots” is not the design's English.
    expect(await screen.findByText('1 spot · private by default')).toBeOnTheScreen();
    expect(screen.queryByText('1 spots · private by default')).not.toBeOnTheScreen();
  });

  it('prints no count while the plan is still being read', async () => {
    // An unknown count is not zero: the frame's label is drawn, and the number waits until the
    // record has answered. The screen reads three records on mount — the consent, the report
    // queue and the plan — and each `Once` implementation leaves every later read to the store
    // the rest of the file uses.
    const hanging = () => new Promise<string | null>(() => {});
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockImplementationOnce(hanging)
      .mockImplementationOnce(hanging)
      .mockImplementationOnce(hanging);

    await render(<PrivacySettingsScreen />);

    expect(screen.getByText('Saved spots')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('privacy-saved-spots-row')).queryByText(/^\d+$/),
    ).not.toBeOnTheScreen();
    // The subtitle counts what it describes, so it waits with the count rather than claiming
    // the plan holds nothing.
    expect(screen.queryByText(/private by default$/)).not.toBeOnTheScreen();
  });

  it('prints no count when the plan could not be read at all', async () => {
    // The same reading over a store that refuses: the app does not know the count, so it prints
    // none — and the sites that need the consent say so, because that read failed too.
    const refused = () => Promise.reject(new Error('the store refused'));
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockImplementationOnce(refused)
      .mockImplementationOnce(refused)
      .mockImplementationOnce(refused);

    await render(<PrivacySettingsScreen />);
    await waitFor(() => expect(screen.getByText(SAVE_FAILED)).toBeOnTheScreen());

    expect(
      within(screen.getByTestId('privacy-saved-spots-row')).queryByText(/^\d+$/),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText(/private by default$/)).not.toBeOnTheScreen();
  });

  it('opens the saved spots it counts, and is a reading until the route can', async () => {
    await saveZone('Z14', 'bilberry');
    const onOpenSavedSpots = jest.fn();
    const { rerender } = await render(<PrivacySettingsScreen />);

    // With nowhere to navigate to, the row is drawn as the reading it is: no role, no press.
    expect(screen.getByTestId('privacy-saved-spots-row')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Saved spots/ })).not.toBeOnTheScreen();

    await rerender(<PrivacySettingsScreen onOpenSavedSpots={onOpenSavedSpots} />);
    await fireEvent.press(screen.getByRole('button', { name: /^Saved spots/ }));

    expect(onOpenSavedSpots).toHaveBeenCalledTimes(1);
  });

  it('opens the two screens its remaining rows name, and is a reading until the route can', async () => {
    const onOpenAccountSecurity = jest.fn();
    const onOpenTermsPrivacy = jest.fn();
    const { rerender } = await render(<PrivacySettingsScreen />);

    // Frame 14's own rows (nodes 5:23677 and 5:23688), in the frame's order: “Account &
    // security” between the sync row and the language row, and “Terms & privacy” last in the
    // group. Both screens behind them are app-drawn (ADR-039).
    expect(screen.getByTestId('privacy-account-security-row')).toBeOnTheScreen();
    expect(screen.getByTestId('privacy-terms-privacy-row')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Account & security' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Terms & privacy' })).not.toBeOnTheScreen();

    await rerender(
      <PrivacySettingsScreen
        onOpenAccountSecurity={onOpenAccountSecurity}
        onOpenTermsPrivacy={onOpenTermsPrivacy}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Account & security' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Terms & privacy' }));

    expect(onOpenAccountSecurity).toHaveBeenCalledTimes(1);
    expect(onOpenTermsPrivacy).toHaveBeenCalledTimes(1);
  });

  it('names the language the app is in, as the reading it is', async () => {
    await render(<PrivacySettingsScreen />);

    // The app follows the device's language and has no picker to open (ADR-017), so the row is
    // the design's drawing with its value and no control.
    expect(screen.getByText('Language')).toBeOnTheScreen();
    expect(screen.getByText('English')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Language' })).not.toBeOnTheScreen();
  });

  it('signs out when the frame’s last control is confirmed', async () => {
    const onSignOut = jest.fn().mockResolvedValue(undefined);

    await render(<PrivacySettingsScreen onSignOut={onSignOut} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    // A deletion is named before it is done: the first press opens the confirmation, not the
    // deletion (frontend review, 2026-10-25).
    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.getByText('Sign out of this phone?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out and delete' }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(SIGN_OUT_FAILED)).not.toBeOnTheScreen());
  });

  it('keeps the session when the confirmation is cancelled', async () => {
    const onSignOut = jest.fn().mockResolvedValue(undefined);

    await render(<PrivacySettingsScreen onSignOut={onSignOut} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Keep me signed in' }));

    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.queryByText('Sign out of this phone?')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeOnTheScreen();
  });

  it('reports a sign-out that did not finish, and offers it again', async () => {
    const onSignOut = jest.fn().mockRejectedValue(new Error('the store refused'));

    await render(<PrivacySettingsScreen onSignOut={onSignOut} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out and delete' }));

    // The run stopped part-way, so the copy cannot claim nothing went. The confirmation stays
    // open with the action offered again rather than stuck.
    expect(await screen.findByText(SIGN_OUT_FAILED)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign out and delete' })).toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<PrivacySettingsScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<PrivacySettingsScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('says a preview may start with sample records', async () => {
    await render(<PrivacySettingsScreen />);

    expect(screen.getByTestId('preview-sample-data')).toBeOnTheScreen();
  });

  it('does not promise samples in a production build', async () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';

    try {
      await render(<PrivacySettingsScreen />);

      expect(screen.queryByTestId('preview-sample-data')).not.toBeOnTheScreen();
    } finally {
      delete process.env.EXPO_PUBLIC_APP_ENV;
    }
  });
});
