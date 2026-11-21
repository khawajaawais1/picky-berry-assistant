import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { setAppLocale, useTranslation } from '@/services/i18n';
import { sessionPort } from '@/services/session';
import { installFakeAuthServer } from '@/services/session/testing';

import { accountProfile, fakeAccountApi } from '../../services/testing';
import { AccountLanguage } from '../account-language';

/**
 * The shell's language follower (ADR-067): while an account is signed in, the app speaks the
 * account's language. It draws nothing.
 */
function Probe() {
  const { locale } = useTranslation();
  return <Text testID="locale">{locale}</Text>;
}

beforeEach(async () => {
  installFakeAuthServer();
  await sessionPort.signOut();
  setAppLocale(null);
});

afterEach(() => setAppLocale(null));

describe('AccountLanguage', () => {
  it('speaks the signed-in account’s language', async () => {
    await sessionPort.register({
      displayName: 'Aino',
      email: 'aino@example.fi',
      password: 'berries1234',
      lang: 'fi',
      consents: {},
    });

    await render(
      <>
        <AccountLanguage accountApi={fakeAccountApi(accountProfile({ lang: 'fi' }))} />
        <Probe />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('fi'));
  });

  it('leaves the device’s language alone without an account', async () => {
    const api = fakeAccountApi(accountProfile({ lang: 'fi' }));

    await render(
      <>
        <AccountLanguage accountApi={api} />
        <Probe />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
    expect(api.profile).not.toHaveBeenCalled();
  });
});
