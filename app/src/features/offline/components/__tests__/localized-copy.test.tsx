import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';

import { enqueueReport } from '@/services/report-queue';

/**
 * A device set to Finnish. Frame 13's heading is a sentence with a count inside it, and its row
 * is the design's own line with the picker's values in it, so both have to come from the
 * catalogue in the language the device asked for. The line counts the design draws are measured
 * in the browser harness (`npm run test:layout`).
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
  useLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
}));

// eslint-disable-next-line import/first
import { OfflineSyncScreen } from '../offline-sync-screen';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the sync centre on a Finnish device', () => {
  it('counts the waiting reports and writes their own line in Finnish notation', async () => {
    await enqueueReport({
      amountText: '1,3 kg',
      minutes: 52,
      recordedAt: '2026-08-28T10:55:00.000Z',
      speciesId: 'lingonberry',
      yieldRating: 4,
      zoneId: 'Z14',
    });

    await render(<OfflineSyncScreen />);

    // The disclosure the eyebrow carries is translated too: it is the sentence that keeps the
    // design's sample region below it from reading as what this phone holds (ADR-042).
    expect(screen.getByText('TILI / OFFLINE · SYNKRONOINTI · KAUSIDEMO')).toBeOnTheScreen();
    expect(screen.getByText('Valmiina ilman verkkoa')).toBeOnTheScreen();
    expect(await screen.findByText('Odottaa synkronointia · 1 raportti')).toBeOnTheScreen();
    expect(screen.getByText('Alue 14 · Puolukka')).toBeOnTheScreen();
    // “28.8.”, not “28 Aug”: the day is the language's, and the harvest is the picker's own text.
    expect(screen.getByText('28.8. · 52 min · Arvosana 4 / 5 · 1,3 kg')).toBeOnTheScreen();
    expect(screen.getByText('Jonossa · käynti ja raportti')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Tallennettu tähän puhelimeen. Mitään ei ole lähetetty — synkronointi tulee palvelimen myötä.',
      ),
    ).toBeOnTheScreen();

    expect(screen.queryByText('Ready beyond the signal')).not.toBeOnTheScreen();
  });

  it('says nothing is waiting in Finnish when the phone is holding nothing', async () => {
    await render(<OfflineSyncScreen />);

    expect(await screen.findByText('Mitään ei odota synkronointia.')).toBeOnTheScreen();
  });
});
