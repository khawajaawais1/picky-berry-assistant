import { fireEvent, render, screen } from '@testing-library/react-native';

/**
 * A device set to Finnish. The app is Finnish and English (PROJECT.md), so the copy
 * of every built screen must come from the catalogue rather than from literals in the
 * component — that is what this file holds the screens to, in the language that is
 * not the source one.
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
  useLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
}));

// eslint-disable-next-line import/first
import { OnboardingCreateAccountScreen } from '../create-account-screen';
// eslint-disable-next-line import/first
import { OnboardingLocationConsentScreen } from '../location-consent-screen';
// eslint-disable-next-line import/first
import { OnboardingSignInScreen } from '../sign-in-screen';
// eslint-disable-next-line import/first
import { OnboardingVerificationScreen } from '../verification-screen';
// eslint-disable-next-line import/first
import { OnboardingWelcomeScreen } from '../welcome-screen';

describe('screens on a Finnish device', () => {
  it('renders the welcome screen in Finnish', async () => {
    await render(<OnboardingWelcomeScreen onGetStarted={() => {}} />);

    expect(screen.getByText('KÄYTTÖÖNOTTO · 01 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Tervetuloa luontoon')).toBeOnTheScreen();
    expect(screen.getByText('Löydä. Kerää. Jaa. Säilytä.')).toBeOnTheScreen();
    expect(screen.getByText('Tuoreet tiedot')).toBeOnTheScreen();
    // Kept short so the design's single-line tag row holds in Finnish (see the
    // catalogue's length budget).
    expect(screen.getByText('Yksityinen oletus')).toBeOnTheScreen();
    expect(screen.getByText('Aloita')).toBeOnTheScreen();

    expect(screen.queryByText('Welcome to the outdoors')).not.toBeOnTheScreen();
    expect(screen.queryByText('Get started')).not.toBeOnTheScreen();
  });

  it('renders the sign-in screen in Finnish, which the design never drew', async () => {
    // The app's own screen (ADR-034), so its copy is the catalogue's like every other screen's —
    // and Finnish is the language where a word that does not fit is found.
    await render(<OnboardingSignInScreen onSendCode={() => {}} />);

    expect(screen.getByText('KÄYTTÖÖNOTTO · KIRJAUDU SISÄÄN')).toBeOnTheScreen();
    expect(screen.getByText('Kirjaudu sisään')).toBeOnTheScreen();
    expect(screen.getByText('Kirjaudu sisään koodilla.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Yksi tunnus, sitten kuusi numeroa. Ei salasanaa muistettavaksi — eikä vuodettavaksi.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Sähköposti tai puhelin')).toBeOnTheScreen();
    expect(screen.getByText('Jatka koodilla')).toBeOnTheScreen();
    expect(screen.getByText('Minulla ei ole vielä tiliä')).toBeOnTheScreen();

    expect(screen.queryByText('Continue with a code')).not.toBeOnTheScreen();
    expect(screen.queryByText('Sign in with a code.')).not.toBeOnTheScreen();
  });

  it('renders the create-account screen in Finnish, accessibility labels included', async () => {
    await render(<OnboardingCreateAccountScreen onBack={() => {}} onSubmit={() => {}} />);

    expect(screen.getByText('KÄYTTÖÖNOTTO · 03 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Luo tilisi')).toBeOnTheScreen();
    expect(screen.getByText('Pieni esittely.')).toBeOnTheScreen();
    expect(screen.getByText('Sähköposti')).toBeOnTheScreen();
    expect(screen.getByText('Nimesi')).toBeOnTheScreen();
    expect(screen.getByText('Salasana')).toBeOnTheScreen();
    expect(screen.getByText('Vähintään 8 merkkiä, sisältää numeron.')).toBeOnTheScreen();
    expect(screen.getByText('Lue käyttöehdot ja tietosuoja')).toBeOnTheScreen();
    expect(screen.getByText('Luo tili')).toBeOnTheScreen();
    expect(screen.getByText('Tietosi pysyvät sinun')).toBeOnTheScreen();

    expect(screen.getByLabelText('Takaisin')).toBeOnTheScreen();
    expect(screen.getByLabelText('Näytä salasana')).toBeOnTheScreen();
    expect(
      screen.getByRole('checkbox', {
        name: 'Hyväksyn käyttöehdot ja vahvistan tutustuneeni tietosuojailmoitukseen.',
      }),
    ).toBeOnTheScreen();

    expect(screen.queryByText('Create your account')).not.toBeOnTheScreen();
    expect(screen.queryByText('Back')).not.toBeOnTheScreen();
  });

  it('renders the verification screen in Finnish, naming the address the code belongs to', async () => {
    // The refusal is the one failure line this screen has, and it is Finnish like the rest:
    // the route behind it is where a code is actually answered (`src/services/session/`), so
    // the screen is given a reporter that refuses the code.
    await render(
      <OnboardingVerificationScreen
        destination="aino@example.fi"
        destinationKind="email"
        onSubmitCode={async () => false}
      />,
    );

    expect(screen.getByText('KÄYTTÖÖNOTTO · 04 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Vahvista sähköpostisi')).toBeOnTheScreen();
    expect(screen.getByText('Vahvista, että olet sinä.')).toBeOnTheScreen();
    expect(screen.getByText('Syötä 6-numeroinen koodi aino@example.fi varten.')).toBeOnTheScreen();
    expect(screen.getByText('Vahvistuskoodi')).toBeOnTheScreen();
    expect(
      screen.getByText('Koodi vanhenee 10 minuutissa. Älä jaa sitä kenellekään.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Vahvista ja jatka')).toBeOnTheScreen();
    // No resend row here: this screen was given nobody who can send a code, so the frame's
    // row is absent rather than counting down to a press that cannot act (ADR-048).
    expect(screen.queryByText('Lähetä koodi uudelleen · saatavilla')).not.toBeOnTheScreen();
    expect(screen.getByText('Vaihda sähköpostiosoite')).toBeOnTheScreen();
    expect(screen.getByText('Rekisteröidyitkö puhelimella?')).toBeOnTheScreen();
    expect(
      screen.getByText('Sama kuusinumeroinen vaihe vahvistaa puhelinnumeron.'),
    ).toBeOnTheScreen();

    expect(screen.getByLabelText('Vahvistuskoodi')).toBeOnTheScreen();
    expect(screen.queryByText('Confirm it’s you.')).not.toBeOnTheScreen();
    expect(screen.queryByText('Verify & continue')).not.toBeOnTheScreen();

    // The failure the frame does not draw, in Finnish: the code the app had to refuse is a
    // sentence the user reads, so it is translated like every other line on the screen.
    await fireEvent.changeText(screen.getByLabelText('Vahvistuskoodi'), '482169');
    await fireEvent.press(screen.getByTestId('verification-action'));

    expect(
      screen.getByText('Koodi ei täsmää. Tarkista kuusi numeroa ja yritä uudelleen.'),
    ).toBeOnTheScreen();
  });

  it('renders screen 04 in Finnish for a number, which the frame does not draw', async () => {
    // Screen 03 offers both identifiers and the frame draws one state, so the state it does not
    // draw has its own words — the app's, in both languages (ADR-049 §3.1–§3.2, assumed 2026-10-13).
    // Finnish is where a title that grew by a word is found, and it is measured by the harness.
    await render(
      <OnboardingVerificationScreen destination="+358 40 123 4567" destinationKind="phone" />,
    );

    expect(screen.getByText('Vahvista puhelinnumerosi')).toBeOnTheScreen();
    expect(screen.getByText('Vaihda puhelinnumero')).toBeOnTheScreen();
    expect(screen.getByText('Syötä 6-numeroinen koodi +358 40 123 4567 varten.')).toBeOnTheScreen();

    expect(screen.queryByText('Vahvista sähköpostisi')).not.toBeOnTheScreen();
    expect(screen.queryByText('Vaihda sähköpostiosoite')).not.toBeOnTheScreen();
    expect(screen.queryByText('Rekisteröidyitkö puhelimella?')).not.toBeOnTheScreen();
  });

  it('renders the location-consent screen in Finnish, consent included', async () => {
    await render(<OnboardingLocationConsentScreen />);

    expect(screen.getByText('KÄYTTÖÖNOTTO · 05 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Löydä suuntasi')).toBeOnTheScreen();
    expect(screen.getByText('Anna metsän löytää sinut.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Sijainti auttaa näyttämään lähellä olevat alueet ja tunnistamaan saapumisesi ja lähtösi.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Lähellä olevat paikat ja reitit')).toBeOnTheScreen();
    expect(screen.getByText('Tarkka sijainti Pickyn käytön aikana.')).toBeOnTheScreen();
    expect(screen.getByText('Automaattinen käynnin ajoitus')).toBeOnTheScreen();
    expect(
      screen.getByText('Suostumuksellasi käynnin ajoitus toimii vain sovelluksen ollessa auki.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Tarkkoja GPS-reittejäsi ei koskaan näytetä muille.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Jatka kartalle')).toBeOnTheScreen();
    expect(screen.getByText('Ei nyt · selaa ilman seurantaa')).toBeOnTheScreen();

    // The consent the user has to give, as a screen reader hears it.
    expect(
      screen.getByRole('checkbox', {
        name: 'Suostun käyntien seurantaan käytön aikana. Voit poistaa sen tietosuoja-asetuksissa.',
      }),
    ).toBeOnTheScreen();

    expect(screen.queryByText('Find your bearings')).not.toBeOnTheScreen();
    expect(screen.queryByText('Continue to the map')).not.toBeOnTheScreen();
  });
});
