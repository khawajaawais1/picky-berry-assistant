import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { setAppLocale } from '@/services/i18n';
import { sessionPort } from '@/services/session';
import { installFakeAuthServer } from '@/services/session/testing';

import { accountProfile, fakeAccountApi } from '../../services/testing';
import { LanguageScreen } from '../language-screen';

/**
 * The screen behind frame 14's “Language” row — app-drawn, because the frame draws the row and
 * nothing behind it (ADR-067, amending ADR-017). The choice is the account's: it is saved with
 * `PATCH /me`, and the app speaks it at once.
 */
async function signedIn() {
  await sessionPort.register({
    displayName: 'Aino',
    email: 'aino@example.fi',
    password: 'berries1234',
    lang: 'en',
    consents: {},
  });
}

beforeEach(async () => {
  installFakeAuthServer();
  await sessionPort.signOut();
  setAppLocale(null);
});

afterEach(() => setAppLocale(null));

describe('LanguageScreen', () => {
  it('offers both languages by their own names, with the one in use chosen', async () => {
    await signedIn();
    await render(<LanguageScreen accountApi={fakeAccountApi(accountProfile({ lang: 'en' }))} />);

    expect(screen.getByText('Language')).toBeOnTheScreen();
    const english = await screen.findByRole('radio', { name: 'English' });
    expect(english).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Suomi' })).not.toBeChecked();
  });

  it('saves the choice to the account and speaks it at once', async () => {
    await signedIn();
    const api = fakeAccountApi(accountProfile({ lang: 'en' }));
    await render(<LanguageScreen accountApi={api} />);

    await fireEvent.press(await screen.findByRole('radio', { name: 'Suomi' }));

    expect(api.updateProfile).toHaveBeenCalledWith({ lang: 'fi' });
    // The screen is now in Finnish: its own heading says so.
    expect(await screen.findByText('Kieli')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Suomi' })).toBeChecked();
  });

  it('keeps the language it had and says so when the save fails', async () => {
    await signedIn();
    const api = fakeAccountApi(accountProfile({ lang: 'en' }));
    api.updateProfile.mockResolvedValueOnce({ ok: false, reason: 'unavailable' });
    await render(<LanguageScreen accountApi={api} />);

    await fireEvent.press(await screen.findByRole('radio', { name: 'Suomi' }));

    expect(
      await screen.findByText('The language could not be saved. Try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
  });

  it('offers no choice without an account, and says the app follows the phone', async () => {
    await render(<LanguageScreen accountApi={fakeAccountApi()} />);

    await waitFor(() =>
      expect(
        screen.getByText('Sign in to choose a language. Until then Picky follows this phone’s.'),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    await render(<LanguageScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
