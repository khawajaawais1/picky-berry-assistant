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
import { OnboardingForgotPasswordScreen } from '../forgot-password-screen';
// eslint-disable-next-line import/first
import { OnboardingSignInScreen } from '../sign-in-screen';
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
    // and Finnish is the language where a word that does not fit is found. Since 2026-10-24 the
    // credential is email + password (ADR-054, ADR-059).
    await render(<OnboardingSignInScreen onSignIn={async () => false} />);

    expect(screen.getByText('KÄYTTÖÖNOTTO · KIRJAUDU SISÄÄN')).toBeOnTheScreen();
    // The screen's title and its action are the same word, as they are in English.
    expect(screen.getAllByText('Kirjaudu sisään').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tervetuloa takaisin.')).toBeOnTheScreen();
    expect(screen.getByText('Syötä sähköposti ja salasana, joilla loit tilin.')).toBeOnTheScreen();
    expect(screen.getByText('Sähköpostiosoite')).toBeOnTheScreen();
    expect(screen.getByText('Salasana')).toBeOnTheScreen();
    expect(screen.getByText('Unohditko salasanan?')).toBeOnTheScreen();
    expect(screen.getByText('Minulla ei ole vielä tiliä')).toBeOnTheScreen();

    expect(screen.queryByText('Welcome back.')).not.toBeOnTheScreen();
    expect(
      screen.queryByText('Enter the email and password you signed up with.'),
    ).not.toBeOnTheScreen();
  });

  it('renders the password-reset request in Finnish, the test-build note included', async () => {
    // The app's own journey (ADR-062): the sign-in service owns the link, and the note says no
    // email is sent in a build with no service — in Finnish too, where the sentence is longer.
    await render(<OnboardingForgotPasswordScreen onRequestReset={async () => true} />);

    expect(screen.getByText('KÄYTTÖÖNOTTO · SALASANAN PALAUTUS')).toBeOnTheScreen();
    expect(screen.getByText('Palauta salasana')).toBeOnTheScreen();
    expect(screen.getByText('Unohditko salasanasi?')).toBeOnTheScreen();
    expect(screen.getByText('Sähköpostiosoite')).toBeOnTheScreen();
    expect(screen.getByText('Pyydä palautuslinkki')).toBeOnTheScreen();

    expect(screen.queryByText('Reset password')).not.toBeOnTheScreen();
    expect(screen.queryByText('Forgot your password?')).not.toBeOnTheScreen();
  });

  it('renders the reset confirmation in Finnish, without claiming a delivery', async () => {
    await render(<OnboardingForgotPasswordScreen onRequestReset={async () => true} />);

    await fireEvent.changeText(screen.getByLabelText('Sähköpostiosoite'), 'aino@example.fi');
    await fireEvent.press(screen.getByRole('button', { name: 'Pyydä palautuslinkki' }));

    expect(await screen.findByText('Palautuspyyntö vastaanotettu.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Jos osoitteella aino@example.fi on tili, seuraava vaihe on kirjautumispalvelun palautuslinkki tähän osoitteeseen. Sovellus ei koskaan tallenna salasanaasi.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Testiversio')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Kirjautumispalvelua ei ole kytketty tähän versioon, joten palautussähköpostia ei lähetetä. Valmiissa sovelluksessa linkki menisi tähän osoitteeseen.',
      ),
    ).toBeOnTheScreen();
  });

  it('renders the create-account screen in Finnish, accessibility labels included', async () => {
    await render(<OnboardingCreateAccountScreen onBack={() => {}} onSubmit={async () => true} />);

    expect(screen.getByText('KÄYTTÖÖNOTTO · 03 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Luo tilisi')).toBeOnTheScreen();
    expect(screen.getByText('Pieni esittely.')).toBeOnTheScreen();
    expect(screen.getByText('Sähköpostiosoite')).toBeOnTheScreen();
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

    // The frame's phone chip is gone with the phone flow: the form is email-only.
    expect(screen.queryByText('Puhelinnumero')).not.toBeOnTheScreen();
    expect(screen.queryByText('Create your account')).not.toBeOnTheScreen();
    expect(screen.queryByText('Back')).not.toBeOnTheScreen();
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
