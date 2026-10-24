import { render, screen } from '@testing-library/react-native';

/**
 * A device set to Finnish. The app is Finnish and English (PROJECT.md), so the copy of
 * every built screen must come from the catalogue rather than from literals in the
 * component — that is what this file holds the privacy screen to, in the language that is
 * not the source one. The line counts the design draws are measured in the browser harness
 * (`npm run test:layout`), which is where a translation that no longer fits fails.
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
  useLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
}));

// eslint-disable-next-line import/first
import { AccountSecurityScreen } from '../account-security-screen';
// eslint-disable-next-line import/first
import { PrivacySettingsScreen } from '../privacy-settings-screen';
// eslint-disable-next-line import/first
import { TermsPrivacyScreen } from '../terms-privacy-screen';

describe('the privacy settings screen on a Finnish device', () => {
  it('renders the screen in Finnish, the switch’s accessible name included', async () => {
    await render(<PrivacySettingsScreen />);

    expect(screen.getByText('TILI / OFFLINE · ASETUKSESI')).toBeOnTheScreen();
    expect(screen.getByText('Profiili')).toBeOnTheScreen();
    expect(screen.getByText('GPS-reitit eivät ole koskaan julkisia')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Näkyvyys koskee paikkoja, ei reittiäsi. Tarkkoja reittejä ei näytetä muille.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Käyntien seuranta käytön aikana')).toBeOnTheScreen();
    expect(screen.getByLabelText('Käyntien seuranta käytön aikana')).toBeOnTheScreen();
    // The frame's sync row, with the queue's own count in Finnish, and its saved-spots row,
    // whose subtitle words the same count.
    expect(screen.getByText('Offline-kartat ja synkronointi')).toBeOnTheScreen();
    expect(screen.getByText('0 jonossa')).toBeOnTheScreen();
    expect(screen.getByText('Tallennetut paikat')).toBeOnTheScreen();
    expect(screen.getByText('0 paikkaa · oletuksena yksityisiä')).toBeOnTheScreen();

    expect(screen.queryByText('Profile')).not.toBeOnTheScreen();
    expect(screen.queryByText('Background visit tracking')).not.toBeOnTheScreen();
  });
});

/**
 * The two screens frame 14's remaining rows open, in the language that is not the source one — the
 * app-drawn half of the settings surface (ADR-039), where nothing was ever translated before.
 */
describe('the account screen on a Finnish device', () => {
  it('renders the screen in Finnish, the line it draws instead of an account included', async () => {
    await render(<AccountSecurityScreen />);

    expect(screen.getByText('TILI / OFFLINE · TILI JA TURVALLISUUS')).toBeOnTheScreen();
    expect(screen.getByText('Tili ja turvallisuus')).toBeOnTheScreen();
    expect(screen.getByText('Sähköposti ja salasana ovat avain')).toBeOnTheScreen();
    expect(screen.getByText('Istunto')).toBeOnTheScreen();
    // No session is held in a fresh process, so the line for exactly that is what renders here.
    expect(
      screen.getByText(
        'Istuntoa ei ole käytössä. Istunto kestää tunnin siitä hetkestä, kun kirjaudut sisään.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Ei vielä täällä')).toBeOnTheScreen();

    expect(screen.queryByText('Account & security')).not.toBeOnTheScreen();
    expect(screen.queryByText('Your email and password are the key')).not.toBeOnTheScreen();
  });
});

describe('the terms and privacy screen on a Finnish device', () => {
  it('renders the notice in Finnish, as a phone holding nothing yet', async () => {
    await render(<TermsPrivacyScreen />);

    expect(screen.getByText('TILI / OFFLINE · KÄYTTÖEHDOT JA TIETOSUOJA')).toBeOnTheScreen();
    expect(screen.getByText('Käyttöehdot ja tietosuoja')).toBeOnTheScreen();
    expect(screen.getByText('Tällä puhelimella')).toBeOnTheScreen();
    expect(screen.getByText('Sinusta ei ole vielä mitään tällä puhelimella.')).toBeOnTheScreen();
    expect(screen.getByText('Oikeutesi ja missä ne ovat')).toBeOnTheScreen();
    expect(screen.getByText('Mikään ei lähde tältä puhelimelta')).toBeOnTheScreen();

    expect(screen.queryByText('Terms & privacy')).not.toBeOnTheScreen();
    expect(screen.queryByText('Nothing of yours is on this phone yet.')).not.toBeOnTheScreen();
  });
});
