import { fireEvent, render, screen } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import type { Zone } from '../../domain/zone-source';

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

describe('the discover screen on a Finnish device', () => {
  it('renders the screen, the map’s labels and the source card in Finnish', async () => {
    await render(<DiscoverScreen />, { wrapper: QueryProvider });

    expect(screen.getByText('POIMINTA · KAUSIDEMO / 28.8.')).toBeOnTheScreen();
    expect(screen.getByText('Löydä lähialueet')).toBeOnTheScreen();
    // The real map's own words: what the colours mean, what the fade means, where the pilot
    // area is, and that its zones are the data team's test data.
    expect(screen.getByText('Sadon pisteet')).toBeOnTheScreen();
    expect(screen.getByText('Vaaleat alueet ovat epävarmoja')).toBeOnTheScreen();
    expect(await screen.findByText('50 aluetta · testiaineisto')).toBeOnTheScreen();
    // The map's freshness line reads the payload's own instant in Finnish notation.
    expect(screen.getByText('Päivitetty 3.8.2026')).toBeOnTheScreen();
    // The card is the source's first zone now, named in Finnish: its own place name, the
    // berry the chips asked the source for, and the values the payload carries.
    expect(screen.getByText('Laajavuori 1 · Mustikka')).toBeOnTheScreen();
    expect(screen.getByText('Koealue · testiaineisto')).toBeOnTheScreen();
    expect(screen.getByText('Sato 53 / 100')).toBeOnTheScreen();
    expect(screen.getByText('Kohtalainen varmuus')).toBeOnTheScreen();
    expect(screen.getByText('Kausi ohi')).toBeOnTheScreen();

    // The map's text alternative is translated too: a Finnish screen reader user must not be
    // told the map is a “Map of nearby berry zones”.
    expect(screen.getByLabelText('Kartta lähellä olevista marja-alueista')).toBeOnTheScreen();

    // The frame's two controls and the row under the card, all in Finnish: the field's own
    // promise, the berries the chips ask for, and the words on the map/list row.
    expect(screen.getByLabelText('Hae paikkaa tai aluetta')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Puolukka' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mustikka' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Lakka' })).toBeOnTheScreen();
    expect(screen.getByText('Kartta valittuna')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Näytä alueluettelo' })).toBeOnTheScreen();

    expect(screen.queryByText('Discover nearby')).not.toBeOnTheScreen();
    expect(screen.queryByText('Zone 14 · Lingonberry')).not.toBeOnTheScreen();
  });

  it('says in Finnish what the filter left, including the case of one zone', async () => {
    await render(<DiscoverScreen />, { wrapper: QueryProvider });
    await screen.findByText('50 aluetta · testiaineisto');

    await fireEvent.changeText(screen.getByLabelText('Hae paikkaa tai aluetta'), 'Laajavuori 50');

    // The singular is its own string in both languages: “{count} zones match” would print
    // “1 zones match”, and Finnish agrees with the number here. It is copy the picker reads
    // exactly when a filter has just narrowed the map, so it has to be translated.
    expect(screen.getByText('1 alue vastaa hakua')).toBeOnTheScreen();
    expect(screen.getByText('1 alue · testiaineisto')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Hae paikkaa tai aluetta'), 'Kilimajärvi');

    expect(screen.getByText('Mikään alue ei vastaa hakua')).toBeOnTheScreen();
  });

  it('reads another berry’s scores in Finnish when its chip is pressed', async () => {
    await render(<DiscoverScreen />, { wrapper: QueryProvider });
    await screen.findByText('Sato 53 / 100');

    await fireEvent.press(screen.getByRole('button', { name: 'Puolukka' }));

    // The same zone, the lingonberry score the stub carries, said in Finnish.
    expect(await screen.findByText('Laajavuori 1 · Puolukka')).toBeOnTheScreen();
    expect(screen.getByText('Sato 70 / 100')).toBeOnTheScreen();
    expect(screen.getByText('Kohtalainen varmuus')).toBeOnTheScreen();
    expect(screen.getByText('Kypsä nyt')).toBeOnTheScreen();
  });

  it('names the zone list’s rows in Finnish, chips and all', async () => {
    await render(<DiscoverScreen />, { wrapper: QueryProvider });
    await screen.findByText('50 aluetta · testiaineisto');

    await fireEvent.press(screen.getByRole('button', { name: 'Näytä alueluettelo' }));

    expect(screen.getByTestId('zone-list')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 1 · Mustikka')).toBeOnTheScreen();
    // The row's season chip is the card's own word for the same state, and its yield chip
    // prints the source's score through the Finnish sentence. More than one stub zone can
    // share a score or a season, so the list is asked rather than the whole screen.
    expect(screen.getAllByText('Sato 53 / 100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kausi ohi').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Näytä kartta' })).toBeOnTheScreen();
  });
});

describe('the zone details screen on a Finnish device', () => {
  it('renders the frame’s figures, its forecast note and its report in Finnish', async () => {
    // With the route supplied, because the frame's Navigate action is the screen's one control
    // and its label carries the distance in Finnish notation.
    await render(<ZoneDetailsScreen onNavigate={jest.fn()} />);

    expect(screen.getByText('POIMINTA · ALUEEN TIEDOT · KAUSIDEMO')).toBeOnTheScreen();
    expect(screen.getByText('Alue 14 · Laajavuori')).toBeOnTheScreen();
    expect(screen.getByText('/ 100 sadon pisteet')).toBeOnTheScreen();
    expect(screen.getByText('Varma tieto')).toBeOnTheScreen();
    expect(screen.getByText('11 havaintoa tällä viikolla')).toBeOnTheScreen();
    // The state chip is the map legend's word for the same zone, in the same language.
    expect(screen.getByText('Poimimaton')).toBeOnTheScreen();
    expect(screen.getByText('Kypsä nyt')).toBeOnTheScreen();
    expect(screen.getByText('Ennuste olosuhteista, ei taattu sato.')).toBeOnTheScreen();
    expect(screen.getByText('Tämän päivän näkymät')).toBeOnTheScreen();
    expect(screen.getByText('18°C · Heikko tuuli · Ennuste klo 08:00')).toBeOnTheScreen();
    expect(screen.getByText('Tuoreet havainnot')).toBeOnTheScreen();
    expect(
      screen.getByText('Luotettu havainto · 38 min sitten · Arvosana 4 / 5'),
    ).toBeOnTheScreen();
    // The action that opens screen 08 names the same walk in Finnish notation.
    expect(screen.getByText('Reitille · 1,4 km')).toBeOnTheScreen();
    // …and the species row (frame 07's node `5:23047`) says what is found in the zone, in
    // Finnish, with the same words the filter chips and the report chips use.
    expect(screen.getByTestId('zone-species-chip-lingonberry')).toHaveTextContent('Puolukka');
    expect(screen.getByTestId('zone-species-chip-bilberry')).toHaveTextContent('Mustikka');

    expect(screen.queryByText('High confidence')).not.toBeOnTheScreen();
    expect(screen.queryByText('Fresh from pickers')).not.toBeOnTheScreen();
  });

  it('reads a source zone in Finnish, with the sample note in Finnish too', async () => {
    const zone: Zone = {
      id: 'zone-a',
      h3: 'zone-a',
      name: 'Laajavuori 1',
      score: 70,
      confidence: 'high',
      ripeness: 'ripe',
      scores: {
        bilberry: { score: 53, confidence: 'medium', ripeness: 'past' },
        lingonberry: { score: 70, confidence: 'high', ripeness: 'ripe' },
      },
      ring: [
        [25.689711, 62.25623],
        [25.69564, 62.253184],
        [25.703822, 62.254551],
        [25.689711, 62.25623],
      ],
    };

    await render(
      <ZoneDetailsScreen
        species="lingonberry"
        zoneId="zone-a"
        zoneSource={{ list: async () => [zone] }}
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('/ 100 sadon pisteet')).toBeOnTheScreen();
    expect(screen.getByText('Varma tieto')).toBeOnTheScreen();
    expect(screen.getByText('Kypsä nyt')).toBeOnTheScreen();
    // The blocks with no source are the design's sample, and the sentence that says so is a
    // catalogue string like any other — not English appended in code.
    expect(screen.getByTestId('zone-details-sample-note')).toHaveTextContent(
      'Alla olevat näkymät, tuorein havainto, kävelyreitti ja niiden takana oleva raporttilista ovat suunnittelun oma malliesimerkki: sääpalvelua tai raporttivirtaa ei vielä ole.',
    );
  });

  it('names the walk to the zone with the language’s own decimal mark and turn', async () => {
    await render(<RouteToZoneScreen onCancel={jest.fn()} />);

    expect(screen.getByText('POIMINTA · KÄVELYREITTI · KAUSIDEMO')).toBeOnTheScreen();
    expect(screen.getByText('Alueelle 14')).toBeOnTheScreen();
    // The frame promises a downloaded tile cache. Nothing is downloaded, so the note says what
    // the app can be true about — the boundaries are drawn from data on the device — and names
    // the cache as the thing still missing.
    expect(screen.getByText('Kartta piirretään tällä laitteella')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Laajavuori: alueiden rajat piirretään tällä laitteella. Karttatiilejä ei ole vielä ladattu.',
      ),
    ).toBeOnTheScreen();
    // “1,4 km”, not “1.4 km”: the number is data and the notation is the language's.
    expect(screen.getByText('1,4 km')).toBeOnTheScreen();
    expect(screen.getByText('Kävelymatka')).toBeOnTheScreen();
    expect(screen.getByText('Arvioitu perillä · 10:03')).toBeOnTheScreen();
    expect(screen.getByText('Seuraa metsäpolkua')).toBeOnTheScreen();
    expect(screen.getByText('Käänny oikealle 180 m kuluttua · Laajavuori')).toBeOnTheScreen();
    expect(screen.getByText('Peruuta reitti')).toBeOnTheScreen();

    expect(screen.queryByText('1.4 km')).not.toBeOnTheScreen();
    expect(screen.queryByText('Walking distance')).not.toBeOnTheScreen();
  });

  it('names the walk on to the visit in Finnish, now that the action leads there', async () => {
    await render(<RouteToZoneScreen onCancel={jest.fn()} onStart={jest.fn()} />);

    expect(screen.getByText('Aloita kävely')).toBeOnTheScreen();
    expect(screen.queryByText('Start walking')).not.toBeOnTheScreen();
  });
});

describe('the active visit screen on a Finnish device', () => {
  it('renders the frame’s copy in Finnish, including the species in its status label', async () => {
    await render(<ActiveVisitScreen onEnd={jest.fn()} />);

    expect(screen.getByText('POIMINTA · KÄYNTI KÄYNNISSÄ · KAUSIDEMO')).toBeOnTheScreen();
    expect(screen.getByText('Poiminta alueella 14')).toBeOnTheScreen();
    expect(screen.getByText('Saapuminen havaittiin automaattisesti')).toBeOnTheScreen();
    expect(screen.getByText('AKTIIVINEN · PUOLUKKA')).toBeOnTheScreen();
    expect(screen.getByText('Aika alueella · ei tarvitse verkkoa')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Vain sinä näet reittisi. Muut näkevät alueen tilan, eivät tarkkaa GPS-jälkeäsi.',
      ),
    ).toBeOnTheScreen();
    // The two action labels are the shortened ones the design's label box can hold (see fi.ts).
    expect(screen.getByText('Keskeytä')).toBeOnTheScreen();
    expect(screen.getByText('Lopeta')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Alueelta poistuminen päättää käynnin automaattisesti ja avaa pikaraportin.',
      ),
    ).toBeOnTheScreen();

    expect(screen.queryByText('ACTIVE · LINGONBERRY')).not.toBeOnTheScreen();
    expect(screen.queryByText('Pause visit')).not.toBeOnTheScreen();
  });
});

describe('the alerts screen on a Finnish device', () => {
  it('renders the alert, its reasons and its disclaimer in Finnish', async () => {
    await render(<AlertsScreen />);

    expect(screen.getByText('POIMINTA · ENNUSTEEN PERUSTEET · KAUSIDEMO')).toBeOnTheScreen();
    expect(screen.getByText('Vihje metsästä')).toBeOnTheScreen();
    expect(screen.getByText('TÄNÄÄN · 28.8. · 09:30')).toBeOnTheScreen();
    // “1,8 km”, not “1.8 km”: the distance is data and its notation is the language's.
    expect(screen.getByText('Kypsiä mustikoita 1,8 km pohjoiseen')).toBeOnTheScreen();
    expect(screen.getByText('82 / 100 sato')).toBeOnTheScreen();
    // The same word frame 07's zone card gives the same confidence.
    expect(screen.getByText('Varma tieto')).toBeOnTheScreen();
    expect(screen.getByText('Alue 18 · Laajavuori · 60 min sitten')).toBeOnTheScreen();
    expect(screen.getByText('Miksi tämä hälytys?')).toBeOnTheScreen();
    expect(screen.getByText('Lämmin viikko')).toBeOnTheScreen();
    expect(screen.getByText('Kolme lämmintä päivää edistää kypsymistä.')).toBeOnTheScreen();
    expect(screen.getByText('Sunnuntain sade')).toBeOnTheScreen();
    expect(screen.getByText('Viimeksi poimittu 6 päivää sitten')).toBeOnTheScreen();
    // The frame's note claims a model that combines three sources, and none of the three
    // exists. What is drawn instead says the alert is a sample and keeps the design's promise.
    expect(
      screen.getByText(
        'Esimerkkihälytys. Sää-, kausi- tai havaintolähdettä ei ole vielä liitetty, eikä satoa taata.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        'Ennusteet yhdistävät sään, kauden ja luotettavuuspainotetut havainnot. Satoa ei taata.',
      ),
    ).not.toBeOnTheScreen();

    expect(screen.queryByText('A heads-up from the forest')).not.toBeOnTheScreen();
  });
});

describe('the season screen on a Finnish device', () => {
  it('renders the month, its chart and its history in Finnish notation', async () => {
    await render(<SeasonInsightsScreen />);

    expect(screen.getByText('POIMINTA · HENKILÖKOHTAISET TIEDOT · KAUSIDEMO')).toBeOnTheScreen();
    expect(screen.getByText('Kautesi tähän mennessä')).toBeOnTheScreen();
    expect(screen.getByText('Elokuu 2026')).toBeOnTheScreen();
    expect(screen.getByText('Kaikki käynnit')).toBeOnTheScreen();
    expect(screen.getByText('Hyvä kuukausi metsässä.')).toBeOnTheScreen();
    // “4,5 kg”, not “4.5 kg”: the figure is data and the decimal mark is the language's.
    expect(screen.getByText('4,5 kg')).toBeOnTheScreen();
    expect(screen.getByText('Sato yhteensä')).toBeOnTheScreen();
    // “1,5” is both the rate in the summary card and a bar's own label, so it is counted.
    expect(screen.getAllByText('1,5')).toHaveLength(2);
    expect(screen.getByText('kg / tunti')).toBeOnTheScreen();
    expect(screen.getByText('Alueita käyty')).toBeOnTheScreen();
    expect(screen.getByText('Aikaa alueilla')).toBeOnTheScreen();
    expect(screen.getByText('Mediaanikesto')).toBeOnTheScreen();
    expect(screen.getByText('Sato käynneittäin')).toBeOnTheScreen();
    expect(screen.getByText('Käyntihistoria')).toBeOnTheScreen();
    // The design's own sample visits, written the Finnish way: “28.8.” and “1,3 kg”.
    expect(screen.getByText('Alue 14 · Puolukka')).toBeOnTheScreen();
    expect(screen.getByText('28.8. · 52 min · 1,3 kg')).toBeOnTheScreen();
    expect(screen.getByText('Jonossa')).toBeOnTheScreen();
    expect(screen.getAllByText('Synkronoitu')).toHaveLength(2);
    expect(
      screen.getByText(
        'Sisältää jonossa olevan käyntisi. Satoasteet lasketaan vain käynneistä, joilla on kirjattu määrä.',
      ),
    ).toBeOnTheScreen();

    expect(screen.queryByText('Your season so far')).not.toBeOnTheScreen();
    expect(screen.queryByText('Visit history')).not.toBeOnTheScreen();
  });
});

describe('the post-visit feedback screen on a Finnish device', () => {
  it('renders the report’s question, its five answers and its note in Finnish', async () => {
    await render(<PostVisitFeedbackScreen onSave={jest.fn()} onSkip={jest.fn()} />);

    expect(screen.getByText('POIMINTA · PIKARAPORTTI · KAUSIDEMO')).toBeOnTheScreen();
    expect(screen.getByText('Miten poiminta sujui?')).toBeOnTheScreen();
    expect(screen.getByText('Poistuminen havaittu · käynti päättyi')).toBeOnTheScreen();
    expect(screen.getByText('Alue 14 · 28.8. · 10:03–10:55 · 52 min')).toBeOnTheScreen();
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
});
