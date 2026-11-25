import { fireEvent, render, screen } from '@testing-library/react-native';
import { testZoneSource } from '@/features/discover/services/test-zone-source';

import { QueryProvider } from '@/services/query-client';

import { REASONING_ALERTS, liveZoneSource, OWN_REPORTS, SEASON } from '../../test-fixtures';

/**
 * A device set to Finnish. The app is Finnish and English (PROJECT.md), so the copy of every
 * built screen must come from the catalogue rather than from literals in the component —
 * including the words painted on the map, which is the whole reason they are components and
 * not part of the drawing. The line counts the design draws are measured in the browser
 * harness (`npm run test:layout`), which is where a translation that no longer fits fails.
 *
 * The same file carries the **disclosure** half of the screens that show the design's sample:
 * five of them name the demo season in their eyebrow in Finnish as frame 06's map does in
 * English, and the two lines that claimed a tile cache and a forecast model say what is true
 * instead. A disclosure is copy like any other, so it is translated, not appended in code.
 */
jest.mock('@/hooks/use-device-position', () => ({
  // About 1.4 km south of the test zone's middle.
  useDevicePosition: () => ({
    fix: { latitude: 62.2422, longitude: 25.6964, accuracyMeters: 10, at: 0 },
    status: 'tracking',
  }),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
  useLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
}));

// eslint-disable-next-line import/first
import { ActiveVisitScreen } from '../active-visit-screen';
// eslint-disable-next-line import/first
import { AlertsScreen } from '../alerts-screen';
// eslint-disable-next-line import/first
import { DiscoverScreen } from '../discover-screen';
// eslint-disable-next-line import/first
import { PostVisitFeedbackScreen } from '../post-visit-feedback-screen';
// eslint-disable-next-line import/first
import { RouteToZoneScreen } from '../route-to-zone-screen';
// eslint-disable-next-line import/first
import { SeasonInsightsScreen } from '../season-insights-screen';
// eslint-disable-next-line import/first
import { ZoneDetailsScreen } from '../zone-details-screen';

const VISIT = {
  endedAt: new Date(2026, 7, 28, 10, 55).getTime(),
  openedAt: new Date(2026, 7, 28, 10, 3).getTime(),
  visitId: 'visit-1',
  zoneId: 'zone-laajavuori-1',
  zoneName: 'Laajavuori 1',
};

describe('the discover screen on a Finnish device', () => {
  it('renders the screen, the map’s labels and the source card in Finnish', async () => {
    await render(
      <DiscoverScreen onOpenLocationSettings={jest.fn()} zoneSource={testZoneSource} />,
      { wrapper: QueryProvider },
    );

    // The real map's own words: what the colours mean, what the fade means, where the pilot
    // area is, and that its zones are the data team's test data.
    expect(screen.getByText('Sadon pisteet')).toBeOnTheScreen();
    expect(screen.getByText('Vaaleat alueet ovat epävarmoja')).toBeOnTheScreen();
    expect(await screen.findByText('50 aluetta · testiaineisto')).toBeOnTheScreen();
    // The map's freshness line reads the payload's own instant in Finnish notation.
    expect(screen.getByText('Päivitetty 3.8.2026')).toBeOnTheScreen();
    // The card is the source's first zone now, named in Finnish: its own place name, the
    // berry whose best selected score it prints, and the values the payload carries.
    expect(screen.getByText('Laajavuori 1 · Puolukka')).toBeOnTheScreen();
    expect(screen.getByText('Koealue · testiaineisto')).toBeOnTheScreen();
    expect(screen.getByText('Sato 70 / 100')).toBeOnTheScreen();
    expect(screen.getByText('Kohtalainen varmuus')).toBeOnTheScreen();
    expect(screen.getByText('Kypsä nyt')).toBeOnTheScreen();

    // The map's text alternative is translated too: a Finnish screen reader user must not be
    // told the map is a “Map of nearby berry zones”.
    expect(screen.getByLabelText('Kartta lähellä olevista marja-alueista')).toBeOnTheScreen();

    // The frame's two controls and the row under the card, all in Finnish: the field's own
    // promise, the berries the chips ask for, and the words on the map/list row.
    expect(screen.getByLabelText('Hae paikkaa tai aluetta')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Puolukka' })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Mustikka' })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Lakka' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Näytä alueluettelo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Keskitä kartta sijaintiini' })).toBeOnTheScreen();

    expect(screen.queryByText('Discover nearby')).not.toBeOnTheScreen();
    expect(screen.queryByText('Zone 14 · Lingonberry')).not.toBeOnTheScreen();
  });

  it('says in Finnish what the filter left, including the case of one zone', async () => {
    await render(<DiscoverScreen zoneSource={testZoneSource} />, { wrapper: QueryProvider });
    await screen.findByText('50 aluetta · testiaineisto');

    await fireEvent.changeText(screen.getByLabelText('Hae paikkaa tai aluetta'), 'Laajavuori 50');

    // The singular is its own string in both languages: “{count} zones match” would print
    // “1 zones match”, and Finnish agrees with the number here. It is copy the picker reads
    // exactly when a filter has just narrowed the map, so it has to be translated.
    expect(screen.getByText('1 alue vastaa hakua')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Hae paikkaa tai aluetta'), 'Kilimajärvi');

    expect(screen.getByText('Mikään alue ei vastaa hakua')).toBeOnTheScreen();
  });

  it('reads the remaining berries in Finnish when a chip is turned off', async () => {
    await render(<DiscoverScreen zoneSource={testZoneSource} />, { wrapper: QueryProvider });
    await screen.findByText('Sato 70 / 100');

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Puolukka' }));

    // With lingonberry off, the same zone's best remaining score is bilberry's, said in Finnish.
    expect(await screen.findByText('Laajavuori 1 · Mustikka')).toBeOnTheScreen();
    expect(screen.getByText('Sato 53 / 100')).toBeOnTheScreen();
    expect(screen.getByText('Kohtalainen varmuus')).toBeOnTheScreen();
    expect(screen.getByText('Kausi ohi')).toBeOnTheScreen();
  });

  it('names the zone list’s rows in Finnish, chips and all', async () => {
    await render(<DiscoverScreen zoneSource={testZoneSource} />, { wrapper: QueryProvider });
    await screen.findByText('50 aluetta · testiaineisto');

    await fireEvent.press(screen.getByRole('button', { name: 'Näytä alueluettelo' }));

    expect(screen.getByTestId('zone-list')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 1 · Puolukka')).toBeOnTheScreen();
    // The row's season chip is the card's own word for the same state, and its yield chip
    // prints the source's score through the Finnish sentence. More than one stub zone can
    // share a score or a season, so the list is asked rather than the whole screen.
    expect(screen.getAllByText('Sato 70 / 100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kypsä nyt').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Näytä kartta' })).toBeOnTheScreen();
  });
});

describe('the zone details screen on a Finnish device', () => {
  it('reads a served zone in Finnish, with the walk in Finnish notation', async () => {
    await render(
      <ZoneDetailsScreen
        onNavigate={jest.fn()}
        species="lingonberry"
        zoneId="zone-a"
        zoneSource={liveZoneSource()}
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('/ 100 sadon pisteet')).toBeOnTheScreen();
    expect(screen.getByText('Varma tieto')).toBeOnTheScreen();
    expect(screen.getByText('Kypsä nyt')).toBeOnTheScreen();
    expect(screen.getByText('Reitille · 1,4 km')).toBeOnTheScreen();
    expect(screen.queryByText('High confidence')).not.toBeOnTheScreen();
  });

  it('names the walk to the zone with the language’s own decimal mark and heading', async () => {
    await render(
      <RouteToZoneScreen
        onCancel={jest.fn()}
        onStart={jest.fn()}
        zoneId="zone-a"
        zoneSource={liveZoneSource()}
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('Kohteeseen Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('POIMINTA · KÄVELYREITTI')).toBeOnTheScreen();
    expect(screen.getByText('1,4 km')).toBeOnTheScreen();
    expect(screen.getByText('Linnuntie')).toBeOnTheScreen();
    expect(screen.getByText('Pohjoiseen, linnuntietä 1,4 km')).toBeOnTheScreen();
    expect(screen.getByText('Reittiohjeet karttasovelluksessa')).toBeOnTheScreen();
    expect(screen.getByText('Aloita kävely')).toBeOnTheScreen();
    expect(screen.getByText('Peruuta reitti')).toBeOnTheScreen();
    expect(screen.queryByText('1.4 km')).not.toBeOnTheScreen();
  });
});

describe('the active visit screen on a Finnish device', () => {
  it('renders the running visit in Finnish', async () => {
    await render(<ActiveVisitScreen onEnd={jest.fn()} visit={VISIT} />);

    expect(screen.getByText('POIMINTA · KÄYNTI KÄYNNISSÄ')).toBeOnTheScreen();
    expect(screen.getByText('Poiminta alueella Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('Saapuminen havaittu')).toBeOnTheScreen();
    expect(screen.getByText('AKTIIVINEN KÄYNTI')).toBeOnTheScreen();
    expect(screen.getByText('Aika alueella · ei tarvitse verkkoa')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Vain sinä näet reittisi. Muut näkevät alueen tilan, eivät tarkkaa GPS-jälkeäsi.',
      ),
    ).toBeOnTheScreen();
    // The design's label box holds the shortened action (see fi.ts).
    expect(screen.getByText('Lopeta')).toBeOnTheScreen();
    expect(
      screen.getByText('Seuranta huomaa poistumisen ja päättää käynnin lyhyen armonajan jälkeen.'),
    ).toBeOnTheScreen();

    expect(screen.queryByText('ACTIVE VISIT')).not.toBeOnTheScreen();
    expect(screen.queryByText('End visit')).not.toBeOnTheScreen();
  });

  it('renders the empty state in Finnish', async () => {
    await render(<ActiveVisitScreen />);

    expect(screen.getByText('POIMINTA · AKTIIVINEN KÄYNTI')).toBeOnTheScreen();
    expect(screen.getByText('Käyntiä ei ole käynnissä')).toBeOnTheScreen();
    expect(screen.getByText('Käynnin seuranta')).toBeOnTheScreen();
    expect(
      screen.getByText('Käynti alkaa, kun viivyt marja-alueella sovelluksen ollessa auki.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Avaa kartta löytääksesi alueen.')).toBeOnTheScreen();

    expect(screen.queryByText('No visit is running')).not.toBeOnTheScreen();
  });
});

describe('the alerts screen on a Finnish device', () => {
  it('renders the served alert in Finnish notation', async () => {
    await render(<AlertsScreen alertsSource={{ list: async () => REASONING_ALERTS }} />, {
      wrapper: QueryProvider,
    });

    expect(await screen.findByText('Mustikka · Laajavuori 22')).toBeOnTheScreen();
    expect(screen.getByText('POIMINTA · ENNUSTEEN PERUSTELUT')).toBeOnTheScreen();
    expect(screen.getByText('Hälytykset metsästä')).toBeOnTheScreen();
    expect(screen.getByText('71 / 100 sato')).toBeOnTheScreen();
    expect(screen.getByText('Varma tieto')).toBeOnTheScreen();
    expect(screen.queryByText('Alerts from the forest')).not.toBeOnTheScreen();
  });
});

describe('the season screen on a Finnish device', () => {
  it('renders the season, its chart and its history in Finnish notation', async () => {
    await render(
      <SeasonInsightsScreen
        reportsApi={{ season: async () => SEASON, mine: async () => OWN_REPORTS }}
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('4,5 kg')).toBeOnTheScreen();
    expect(screen.getByText('POIMINTA · HENKILÖKOHTAISET TIEDOT')).toBeOnTheScreen();
    expect(screen.getByText('Kautesi tähän mennessä')).toBeOnTheScreen();
    expect(screen.getByText('Tämä kuukausi')).toBeOnTheScreen();
    expect(screen.getByText('Kautesi 2026')).toBeOnTheScreen();
    expect(screen.getAllByText('1,5')).toHaveLength(2);
    expect(screen.getByText('Sato käynneittäin')).toBeOnTheScreen();
    expect(await screen.findByText('Laajavuori 14 · Puolukka')).toBeOnTheScreen();
    expect(screen.getByText('28.8. · 52 min · 1,3 kg')).toBeOnTheScreen();
    expect(screen.getByText('Synkronoitu')).toBeOnTheScreen();
    expect(screen.queryByText('Visit history')).not.toBeOnTheScreen();
  });
});

describe('the post-visit feedback screen on a Finnish device', () => {
  it('renders the report’s question, its five answers and its note in Finnish', async () => {
    await render(<PostVisitFeedbackScreen onSave={jest.fn()} onSkip={jest.fn()} visit={VISIT} />);

    expect(screen.getByText('POIMINTA · PIKARAPORTTI')).toBeOnTheScreen();
    expect(screen.getByText('Miten poiminta sujui?')).toBeOnTheScreen();
    expect(screen.getByText('Käynti päättyi')).toBeOnTheScreen();
    expect(screen.getByText('Alue Laajavuori 1 · 10:03–10:55 · 52 min')).toBeOnTheScreen();
    expect(screen.getByText('Pieni raportti. Tuoreempi kartta.')).toBeOnTheScreen();
    expect(
      screen.getByText('Arvioi löytämäsi marjat, älä vain kotiin tuotua määrää.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Puolukka')).toBeOnTheScreen();
    expect(screen.getByText('Mustikka')).toBeOnTheScreen();
    expect(screen.getByText('Kuinka runsaasti marjoja oli?')).toBeOnTheScreen();
    expect(screen.getByText('Ei yhtään')).toBeOnTheScreen();
    expect(screen.getByText('Vähän')).toBeOnTheScreen();
    expect(screen.getByText('Kohtalaisesti')).toBeOnTheScreen();
    expect(screen.getByText('Hyvin')).toBeOnTheScreen();
    expect(screen.getByText('Paljon')).toBeOnTheScreen();
    expect(screen.getByText('Kerätty määrä · valinnainen')).toBeOnTheScreen();
    expect(screen.getByText('Offline-tila · valmis jonoon')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Käyntisi ja raporttisi pysyvät tällä puhelimella ja siirtyvät, kun olet verkossa.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Tallenna raportti offline-tilaan')).toBeOnTheScreen();
    expect(screen.getByText('Ohita raportti nyt')).toBeOnTheScreen();

    expect(screen.queryByText('How plentiful were the berries?')).not.toBeOnTheScreen();
    expect(screen.queryByText('Save report offline')).not.toBeOnTheScreen();
  });

  it('renders the empty state in Finnish when no visit has ended', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByText('POIMINTA · PIKARAPORTTI')).toBeOnTheScreen();
    expect(screen.getByText('Ei raportoitavaa käyntiä')).toBeOnTheScreen();
    expect(screen.getByText('Raportti alkaa, kun seurattu käynti päättyy.')).toBeOnTheScreen();
    expect(screen.getByText('Avaa kartta löytääksesi alueen.')).toBeOnTheScreen();
  });
});
