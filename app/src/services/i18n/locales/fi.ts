import type { TranslationKey } from './en';

/**
 * Finnish. The design file contains no Finnish copy, so these strings are written
 * here rather than extracted from Figma and they need a native review before release
 * (PROJECT.md, open questions).
 *
 * Typed against the English catalogue on purpose: adding a key to the source language
 * breaks the typecheck here until it is translated.
 */
export const fi: Record<TranslationKey, string> = {
  'common.back': 'Takaisin',
  'common.readFailed': 'Tallennettuja käyntejä ei voitu lukea.',
  'common.hidePassword': 'Piilota salasana',
  'common.showPassword': 'Näytä salasana',

  // The core navigation's four destinations. “Löydä” is the word screen 06's title already uses
  // (“Löydä lähialueet”), “Käynnit” is what the visit history calls a visit, and “Hälytykset” is
  // the word screen 12's own question uses (“Miksi tämä hälytys?”).
  'navigation.label': 'Päävalikko',
  'navigation.discover': 'Löydä',
  'navigation.visits': 'Käynnit',
  'navigation.alerts': 'Hälytykset',
  'navigation.profile': 'Profiili',

  'app.notFound.action': 'Siirry etusivulle',
  'app.notFound.subtitle': 'Tätä reittiä ei ole olemassa.',
  'app.notFound.title': 'Näkymää ei löytynyt',

  'onboarding.welcome.action': 'Aloita',
  'onboarding.welcome.eyebrow': 'KÄYTTÖÖNOTTO · 01 / 05',
  'onboarding.welcome.footer': 'Tehty Suomen marjakautta varten · EN / FI',
  'onboarding.welcome.headline': 'Löydä. Kerää. Jaa. Säilytä.',
  'onboarding.welcome.signIn': 'Onko sinulla jo tili? Kirjaudu sisään',
  'onboarding.welcome.supporting':
    'Löydä lupaavat marjapaikat Suomessa, seuraa sesonkia ja auta pitämään metsäkartta ajan tasalla.',
  'onboarding.welcome.tag.freshInsights': 'Tuoreet tiedot',
  'onboarding.welcome.tag.offlineReady': 'Toimii offline',
  // “Private by default”, which is what the app actually claims on screen 03 (“Tallennetut
  // paikat ovat oletuksena yksityisiä”). “Yksityinen luonnostaan” is closer to “by
  // nature” but 22 characters, and the design sets these three tags in single-line
  // thirds of the content column.
  'onboarding.welcome.tag.privateByNature': 'Yksityinen oletus',
  'onboarding.welcome.title': 'Tervetuloa luontoon',

  // Kirjautumisnäkymä, jota suunnittelutiedostossa ei ole (ADR-034). Tilillä on nyt oma
  // tunnusparinsa — sähköposti ja salasana (ADR-054, ADR-059) — joten painike kertoo, mitä
  // painallus tekee, ja virherivi kertoo, mitä hylkäys tarkoittaa.
  'onboarding.signIn.action': 'Kirjaudu sisään',
  'onboarding.signIn.createAccount': 'Minulla ei ole vielä tiliä',
  'onboarding.signIn.email': 'Sähköpostiosoite',
  'onboarding.signIn.eyebrow': 'KÄYTTÖÖNOTTO · KIRJAUDU SISÄÄN',
  'onboarding.signIn.failed': 'Sähköposti ja salasana eivät täsmänneet. Yritä uudelleen.',
  'onboarding.signIn.forgotPassword': 'Unohditko salasanan?',
  'onboarding.signIn.heading': 'Tervetuloa takaisin.',
  'onboarding.signIn.password': 'Salasana',
  'onboarding.signIn.supporting': 'Syötä sähköposti ja salasana, joilla loit tilin.',
  'onboarding.signIn.title': 'Kirjaudu sisään',

  // The password-reset journey (ADR-062): the sign-in service owns the link, the app keeps no
  // token, and no string claims that an email was sent while no service is connected.
  'onboarding.forgotPassword.action': 'Pyydä palautuslinkki',
  'onboarding.forgotPassword.eyebrow': 'KÄYTTÖÖNOTTO · SALASANAN PALAUTUS',
  'onboarding.forgotPassword.failed': 'Palautuslinkkiä ei voitu pyytää. Yritä uudelleen.',
  'onboarding.forgotPassword.heading': 'Unohditko salasanasi?',
  'onboarding.forgotPassword.requested.another': 'Käytä toista osoitetta',
  'onboarding.forgotPassword.requested.body':
    'Jos osoitteella {email} on tili, seuraava vaihe on kirjautumispalvelun palautuslinkki tähän osoitteeseen. Sovellus ei koskaan tallenna salasanaasi.',
  'onboarding.forgotPassword.requested.heading': 'Palautuspyyntö vastaanotettu.',
  'onboarding.forgotPassword.requested.live.body':
    'Jos osoitteella {email} on tili, kirjautumispalvelun palautuslinkki on matkalla tähän osoitteeseen. Sovellus ei koskaan tallenna salasanaasi.',
  'onboarding.forgotPassword.requested.live.heading': 'Tarkista sähköpostisi.',
  'onboarding.forgotPassword.requested.test.body':
    'Kirjautumispalvelua ei ole kytketty tähän versioon, joten palautussähköpostia ei lähetetä. Valmiissa sovelluksessa linkki menisi tähän osoitteeseen.',
  'onboarding.forgotPassword.requested.test.title': 'Testiversio',
  'onboarding.forgotPassword.supporting':
    'Syötä tilisi sähköpostiosoite. Palautuslinkit kuuluvat kirjautumispalvelulle; sovellus ei koskaan tallenna salasanaasi.',
  'onboarding.forgotPassword.title': 'Palauta salasana',

  'onboarding.createAccount.action': 'Luo tili',
  'onboarding.createAccount.consent':
    'Hyväksyn käyttöehdot ja vahvistan tutustuneeni tietosuojailmoitukseen.',
  'onboarding.createAccount.eyebrow': 'KÄYTTÖÖNOTTO · 03 / 05',
  'onboarding.createAccount.field.email': 'Sähköpostiosoite',
  'onboarding.createAccount.field.name': 'Nimesi',
  'onboarding.createAccount.field.password': 'Salasana',
  'onboarding.createAccount.failed': 'Tilin luonti ei onnistunut. Yritä uudelleen.',
  'onboarding.createAccount.heading': 'Pieni esittely.',
  'onboarding.createAccount.passwordHint': 'Vähintään 8 merkkiä, sisältää numeron.',
  'onboarding.createAccount.privacy.body':
    'Tallennetut paikat ovat oletuksena yksityisiä. GPS-reittejäsi ei koskaan julkaista.',
  'onboarding.createAccount.privacy.title': 'Tietosi pysyvät sinun',
  'onboarding.createAccount.readTerms': 'Lue käyttöehdot ja tietosuoja',
  'onboarding.createAccount.signIn': 'Oletko jo rekisteröitynyt? Kirjaudu sisään',
  'onboarding.createAccount.supporting':
    'Tallenna paikkasi ja pidä keruuhistoriasi yhdessä paikassa.',
  'onboarding.createAccount.title': 'Luo tilisi',

  // Same as the English: the frame names a settings step the app never takes, so the action names
  // where the press leads (ADR-050). Shorter than the frame's own line, which is what the harness
  // measures the action against.
  'onboarding.location.action': 'Jatka kartalle',
  'onboarding.location.benefit.nearby.body': 'Tarkka sijainti Pickyn käytön aikana.',
  'onboarding.location.benefit.nearby.title': 'Lähellä olevat paikat ja reitit',
  // The frame's line promises timing with the screen locked; the app reads a position in the
  // foreground only, and says so (ADR-045, ADR-047).
  'onboarding.location.benefit.timing.body':
    'Suostumuksellasi käynnin ajoitus toimii vain sovelluksen ollessa auki.',
  'onboarding.location.benefit.timing.title': 'Automaattinen käynnin ajoitus',
  // Kept short so the frame's two lines hold in Finnish beside the 22 px glyph (see the layout
  // harness, which fails when a translation runs to a third line). “Käytön aikana” is the app's own
  // limit — the frame's “taustaseuranta” is withdrawn from the copy and put to the owner as a
  // decision (ADR-047) — and it is the same idiom the first benefit row already uses for the
  // foreground (“Tarkka sijainti Pickyn käytön aikana.”), measured at the two lines the frame draws.
  'onboarding.location.consent':
    'Suostun käyntien seurantaan käytön aikana. Voit poistaa sen tietosuoja-asetuksissa.',
  'onboarding.location.eyebrow': 'KÄYTTÖÖNOTTO · 05 / 05',
  'onboarding.location.heading': 'Anna metsän löytää sinut.',
  'onboarding.location.reassurance': 'Tarkkoja GPS-reittejäsi ei koskaan näytetä muille.',
  'onboarding.location.skip': 'Ei nyt · selaa ilman seurantaa',
  'onboarding.location.supporting':
    'Sijainti auttaa näyttämään lähellä olevat alueet ja tunnistamaan saapumisesi ja lähtösi.',
  'onboarding.location.title': 'Löydä suuntasi',

  // Screen 06. “Season demo” is the frame's own disclosure that its map is not this user's
  // data; the place and lake names are Finnish already, because the frame's map is set in
  // Jyväskylä.
  'discover.eyebrow': 'POIMINTA · KAUSIDEMO / 28.8.',
  'discover.title': 'Löydä lähialueet',
  'discover.map.label': 'Kartta lähellä olevista marja-alueista',
  'discover.map.place': 'Laajavuori',
  'discover.map.lake': 'Tuomiojärvi',
  'discover.map.position': 'Sijaintimerkki kartalla',
  'discover.map.scale': '━━  200 m   ·   Kausidemo',
  'discover.map.count': '{count} aluetta · testiaineisto',
  'discover.map.countOne': '{count} alue · testiaineisto',
  'discover.map.updated': 'Päivitetty {date}',
  'discover.map.loading': 'Ladataan alueita…',
  'discover.map.unavailable': 'Alueita ei voitu lukea',
  'discover.map.empty': 'Ei näytettäviä alueita',
  'discover.score.label': 'Sadon pisteet',
  'discover.score.lowConfidence': 'Vaaleat alueet ovat epävarmoja',
  'discover.zone.a11y': 'Alue {id}, {state}',
  'discover.zone.score.a11y': 'Alue {id}, sadon pisteet {score} sadasta',
  'discover.legend.label': 'Alueiden tilat',
  'discover.legend.unpicked': 'Poimimaton',
  'discover.legend.recentlyPicked': 'Äskettäin poimittu',
  'discover.legend.ripening': 'Kypsymässä',
  'discover.card.title': 'Alue {zone} · {species}',
  'discover.card.zoneTitle': '{zone} · {species}',
  'discover.card.place': 'Laajavuori · 1,4 km kävely',
  'discover.card.yield': 'Sato 78 / 100',
  'discover.card.confidence': 'Varma tieto',
  'discover.card.status': 'Poimimaton · Kypsä · Havainto päivitetty 38 min sitten',
  'discover.card.source': 'Koealue · testiaineisto',
  'discover.ripeness.unripe': 'Ei vielä kypsä',
  'discover.ripeness.ripening': 'Kypsymässä nyt',
  'discover.ripeness.ripe': 'Kypsä nyt',
  'discover.ripeness.past': 'Kausi ohi',
  'discover.card.open': 'Avaa alueen {zone} tiedot',

  // Frame 06's two controls above the map. “Alueluettelo” is the map/list row's own word for
  // the list view, and the species chips read the berries the report chips already name.
  'discover.search.placeholder': 'Hae paikkaa tai aluetta',
  'discover.species.filter': 'Suodata lajin mukaan',
  'discover.view.mapStatus': 'Kartta valittuna',
  'discover.view.listStatus': 'Alueluettelo',
  'discover.view.showList': 'Näytä alueluettelo',
  'discover.view.showMap': 'Näytä kartta',
  'discover.downloads': 'Offline-kartat ja lataukset',
  'discover.list.label': 'Lähellä olevat alueet',
  'discover.list.yield': 'Sato {score} / {max}',
  // Mitä suodatus jätti jäljelle. Suomen kielessä yksikkö ja monikko ovat samassa muodossa
  // (”1 aluetta vastaa” luetaan silti väärin), joten myös yksikölle on oma avain.
  'discover.filter.matchOne': '1 alue vastaa hakua',
  'discover.filter.matches': '{count} aluetta vastaa hakua',
  'discover.filter.none': 'Mikään alue ei vastaa hakua',

  // Screen 07. “High confidence” is the same phrase the zone card already uses
  // (“Varma tieto”), so the zone reads the same way on both screens. The eyebrow repeats the
  // demo disclosure frame 06's map carries (“KAUSIDEMO”): a source zone's own figures come from
  // the zone port, the blocks below them are the design's sample, and the whole screen is the
  // sample when no zone id is given.
  'discover.details.eyebrow': 'POIMINTA · ALUEEN TIEDOT · KAUSIDEMO',
  // The title before a zone is known: loading, a failed read, or an id the source does not know.
  'discover.details.pendingTitle': 'Alueen tiedot',
  'discover.details.unknown':
    'Tämä alue ei ole niissä pilottialueissa, jotka tämä puhelin voi lukea.',
  'discover.details.title': 'Alue {zone} · {place}',
  'discover.details.hero': 'Valokuva marjakaudesta',
  'discover.details.scoreLabel': '/ {max} sadon pisteet',
  'discover.details.confidence.high': 'Varma tieto',
  'discover.details.confidence.medium': 'Kohtalainen varmuus',
  'discover.details.confidence.low': 'Vähäinen varmuus',
  'discover.details.reportsThisWeek': '{count} havaintoa tällä viikolla',
  // Vuodenajan sanat ovat kartan neljä (`discover.ripeness.*`), samat kuin kortilla ja riveillä.
  'discover.details.forecastDisclaimer': 'Ennuste olosuhteista, ei taattu sato.',
  // Sanotaan ennen niitä osioita, joille ei ole lähdettä: lähdealueen oikean pisteen alla
  // lukija tietää, mihin sovelluksen oma tieto päättyy.
  'discover.details.sample':
    'Alla olevat näkymät, tuorein havainto, kävelyreitti ja niiden takana oleva raporttilista ovat suunnittelun oma malliesimerkki: sääpalvelua tai raporttivirtaa ei vielä ole.',
  'discover.details.outlook.title': 'Tämän päivän näkymät',
  'discover.details.outlook.body':
    'Kypsiä puolukoita lämpimän viikon jälkeen. Samanlaisia olosuhteita odotetaan huomenna.',
  // The wind is its own translated phrase rather than a noun the sentence appends, so
  // Finnish can say “Heikko tuuli” where English says “Light wind”.
  'discover.details.weather': '{temperature}°C · {wind} · Ennuste klo {time}',
  'discover.details.wind.light': 'Heikko tuuli',
  'discover.details.wind.moderate': 'Kohtalainen tuuli',
  'discover.details.wind.strong': 'Kova tuuli',
  'discover.details.reports.title': 'Tuoreet havainnot',
  'discover.details.reports.seeAll': 'Näytä kaikki {count}',
  // Havaittavissa oleva teksti on kehyksen oma; saavutettava nimi kertoo, mihin painallus vie.
  'discover.details.reports.seeAll.a11y':
    'Näytä kaikki {count} raporttia · avaa tähän puhelimeen tallennetut raportit',
  'discover.details.reports.quote': '“Reitillä runsaasti kypsiä terttuja.”',
  'discover.details.reports.meta': '{trust} havainto · {minutes} min sitten · Sato {yield} / {max}',
  // Kept to one line: the frame gives this note a single line (342x17), and the first wording
  // (”…lähihavaintojen yhtäpitävyys.”) ran to two — the layout harness caught it.
  'discover.details.reports.scoring':
    'Pisteisiin vaikuttavat tuoreus, luotettavuus ja lähihavainnot.',
  'discover.details.reports.trust.trusted': 'Luotettu',
  'discover.details.reports.trust.unverified': 'Vahvistamaton',
  // Frame 07's bookmark: the control is a glyph, so the label names the control and what its
  // next press does; the saved state is a shape too, never a colour alone.
  'discover.details.save': 'Tallenna alue',
  'discover.details.save.saved': 'Poista alue tallennetuista',
  'discover.details.saveFailed': 'Aluetta ei voitu tallentaa tai poistaa tässä puhelimessa.',
  'discover.details.navigate': 'Reitille · {distance}',

  // Kehyksen 07 “Näytä kaikki 11” -linkin avaama lista — **sovelluksen oma**, koska suunnittelma ei
  // piirtänyt listaa, jonka sen oma linkki nimeää (ADR-044). Kehyksen yksitoista ovat sen
  // malliviikko; alla oleva luku on se, mitä tämä puhelin pitää.
  'discover.zoneReports.eyebrow': 'POIMINTA · ALUEEN RAPORTIT · KAUSIDEMO',
  'discover.zoneReports.title': 'Alue {zone} · raportit',
  'discover.zoneReports.intro':
    'Suunnittelun malliviikkoon kuuluu {count} raporttia lähialueen poimijoilta. Sovellus näyttää vain tähän puhelimeen tallennetut:',
  'discover.zoneReports.held.one': '1 raportti tässä puhelimessa',
  'discover.zoneReports.held.many': '{count} raporttia tässä puhelimessa',
  'discover.zoneReports.row.meta': '{date} · {minutes} min · Sato {yield} / {max} · {amount}',
  'discover.zoneReports.row.metaNoAmount': '{date} · {minutes} min · Sato {yield} / {max}',
  'discover.zoneReports.empty':
    'Tälle alueelle ei ole vielä tallennettu raporttia tässä puhelimessa.',
  'discover.zoneReports.missing':
    'Muiden poimijoiden raportit saapuvat raporttipalvelun mukana, jota tässä sovelluksessa ei vielä ole.',

  // Screen 08. Finnish turns take an allative ending (“oikealle”), so the direction is a word
  // of its own in each language and the sentence around it belongs to the language as well;
  // the place stays a label, because a Finnish case ending cannot be appended to a name the
  // catalogue only knows as data — which is why the note below names the place before a colon
  // rather than in a case the app cannot form.
  //
  // The frame promises a downloaded tile cache and the app downloads nothing, so the note says
  // what it can be true about (the boundaries are drawn from data on the device) and names the
  // cache as the thing still missing.
  'discover.route.eyebrow': 'POIMINTA · KÄVELYREITTI · KAUSIDEMO',
  'discover.route.title': 'Alueelle {zone}',
  'discover.route.offline.title': 'Kartta piirretään tällä laitteella',
  'discover.route.offline.body':
    '{place}: alueiden rajat piirretään tällä laitteella. Karttatiilejä ei ole vielä ladattu.',
  'discover.route.distance': 'Kävelymatka',
  'discover.route.duration': '{minutes} min',
  'discover.route.arrival': 'Arvioitu perillä · {time}',
  'discover.route.guidance.title': 'Seuraa metsäpolkua',
  // Kept to the frame's single line (264x18): the first wording carried the word “määränpää”
  // (destination) as well and ran to two, which the layout harness caught.
  'discover.route.guidance.detail': 'Käänny {direction} {distance} kuluttua · {place}',
  'discover.route.turn.left': 'vasemmalle',
  'discover.route.turn.right': 'oikealle',
  'discover.route.supporting':
    'Pysy merkitvillä poluilla. Reittiarviot voivat vaihdella maaston mukaan.',
  'discover.route.cancel': 'Peruuta reitti',
  'discover.route.start': 'Aloita kävely',

  // Screen 09. “Käynti” is the domain's visit in the design's user-facing voice; the status
  // label carries the species the way the zone card's title does (“Puolukka”), and the visit
  // being timed is the design's own sample, so the eyebrow names the demo.
  'discover.visit.eyebrow': 'POIMINTA · KÄYNTI KÄYNNISSÄ · KAUSIDEMO',
  'discover.visit.title': 'Poiminta alueella {zone}',
  'discover.visit.arrived.title': 'Saapuminen havaittiin automaattisesti',
  'discover.visit.arrived.body':
    'Saavuit alueelle klo {time}. Ajanotto toimii sovelluksen ollessa auki.',
  'discover.visit.status': 'AKTIIVINEN · PUOLUKKA',
  'discover.visit.timerHint': 'Aika alueella · ei tarvitse verkkoa',
  'discover.visit.privacy':
    'Vain sinä näet reittisi. Muut näkevät alueen tilan, eivät tarkkaa GPS-jälkeäsi.',
  // Both action labels are shortened to the design's own action: the frame's label box holds
  // 103 px, and “Keskeytä käynti” and “Lopeta käynti” both wrapped to two lines in it — the
  // layout harness caught it, and the surrounding copy already says what is being paused or
  // ended.
  'discover.visit.pause': 'Keskeytä',
  'discover.visit.resume': 'Jatka',
  'discover.visit.end': 'Lopeta',
  'discover.visit.supporting':
    'Alueelta poistuminen päättää käynnin automaattisesti ja avaa pikaraportin.',

  // Screen 10. The date is the design's own demo and is written the Finnish way (“28.8.”);
  // the five rating words are the frame's answers to one question, so each is a word of its
  // own rather than a phrase a sentence builds. The visit the summary describes is the demo,
  // so the eyebrow names it; what the picker answers below it is their own and is saved.
  'report.eyebrow': 'POIMINTA · PIKARAPORTTI · KAUSIDEMO',
  'report.title': 'Miten poiminta sujui?',
  'report.exit.title': 'Poistuminen havaittu · käynti päättyi',
  'report.exit.body': 'Alue {zone} · 28.8. · {arrival}–{departure} · {minutes} min',
  'report.heading': 'Pieni raportti. Tuoreempi kartta.',
  'report.supporting': 'Arvioi löytämäsi marjat, älä vain kotiin tuotua määrää.',
  'report.species.label': 'Raportin laji',
  'report.species.lingonberry': 'Puolukka',
  'report.species.bilberry': 'Mustikka',
  // Lakka on frame 06's third chip; frame 10's third chip reveals it (ks. kaksi seuraavaa
  // avainta).
  'report.species.cloudberry': 'Lakka',
  // Pilotin neljäs laji (CONTEXT.md §7 repositorion juuressa). Kehys ei piirrä sille omaa
  // siruaan, joten se seuraa suunnittelun kolmea sekä suodattimessa että ruudun 10 “Lisää”-
  // valinnan takana.
  'report.species.crowberry': 'Variksenmarja',
  // Frame 10's third chip: the visible word is the frame's own, the accessible name says what
  // the press does.
  'report.species.more': 'Lisää',
  'report.species.more.a11y': 'Näytä kaikki lajit',
  'report.plentiful': 'Kuinka runsaasti marjoja oli?',
  'report.rating.none': 'Ei yhtään',
  'report.rating.few': 'Vähän',
  'report.rating.fair': 'Kohtalaisesti',
  'report.rating.good': 'Hyvin',
  'report.rating.lots': 'Paljon',
  'report.amount.label': 'Kerätty määrä · valinnainen',
  'report.amount.placeholder': '1,3 kg',
  'report.offline.title': 'Offline-tila · valmis jonoon',
  'report.offline.body':
    'Käyntisi ja raporttisi pysyvät tällä puhelimella ja siirtyvät, kun olet verkossa.',
  'report.save': 'Tallenna raportti offline-tilaan',
  'report.saveFailed': 'Raporttiasi ei voitu tallentaa.',
  'report.skip': 'Ohita raportti nyt',

  // Screen 12. The alert is the design's sample, so the eyebrow names the demo and the closing
  // note says the alert is one. The headline's direction lives in the sentence — Finnish says it
  // with an allative ending (“pohjoiseen”) rather than as a word the app appends to a distance.
  'discover.alert.eyebrow': 'POIMINTA · ENNUSTEEN PERUSTEET · KAUSIDEMO',
  'discover.alert.title': 'Vihje metsästä',
  'discover.alert.stamp': 'TÄNÄÄN · {date} · {time}',
  'discover.alert.headline': 'Kypsiä mustikoita {distance} pohjoiseen',
  'discover.alert.score': '{score} / {max} sato',
  // Kept to the frame's single line (306x18): “Tuorein havainto” (latest report) beside the zone
  // and the place ran to two, which the layout harness caught — the card's own heading already
  // says what the figure is about, so the Finnish line states the reading alone.
  'discover.alert.context': 'Alue {zone} · {place} · {minutes} min sitten',
  'discover.alert.why': 'Miksi tämä hälytys?',
  'discover.alert.reason.warm.title': 'Lämmin viikko',
  'discover.alert.reason.warm.detail': 'Kolme lämmintä päivää edistää kypsymistä.',
  'discover.alert.reason.rain.title': 'Sunnuntain sade',
  'discover.alert.reason.rain.detail': 'Kosteus tukee marjojen kasvua.',
  'discover.alert.reason.picked.title': 'Viimeksi poimittu 6 päivää sitten',
  'discover.alert.reason.picked.detail': 'Tuoreet havainnot lupaavat hyvää paluuta.',
  // The frame's note claims a forecast assembled from weather, season and trust-weighted
  // reports, and none of the three has a source. The line says what is true instead and keeps
  // the design's own promise that a harvest is never guaranteed.
  'discover.alert.note':
    'Esimerkkihälytys. Sää-, kausi- tai havaintolähdettä ei ole vielä liitetty, eikä satoa taata.',
  // The frame's alert-preferences card, drawn as the design's sample: the three values are
  // formatted from `domain/alert.ts` and the last line says so, so none of the figures reads as
  // this phone's own settings. “Push-hälytys” is what a Finnish phone calls one.
  'discover.alert.preferences.title': 'Hälytysasetuksesi',
  'discover.alert.preferences.push': 'Push-hälytykset kypsistä marjoista',
  'discover.alert.preferences.radius': 'Hakusäde',
  'discover.alert.preferences.quiet': 'Hiljaiset tunnit',
  'discover.alert.preferences.quietValue': '{from}–{to}',
  'discover.alert.preferences.species': 'Lajit',
  'discover.alert.preferences.speciesValue': '{species} + {count}',
  'discover.alert.preferences.sample':
    'Suunnittelun esimerkkivalinnat: hälytyksiä ei vielä lähetetä eikä mikään lue sädettä, hiljaisia tunteja tai lajeja.',

  // Screen 13. The sync centre's own heading counts the reports this phone is holding. “Raportti”
  // is the word screens 10 and 11 already use for one, and the singular and plural are separate
  // entries because the sentence is the language's.
  'offline.eyebrow': 'TILI / OFFLINE · SYNKRONOINTI · KAUSIDEMO',
  'offline.title': 'Valmiina ilman verkkoa',
  'offline.sample.note':
    'Alue, tallennustilat ja kaksi alla olevaa painiketta ovat suunnittelun oma esimerkki: tähän puhelimeen ei ole ladattu mitään eikä mikään synkronoidu vielä.',
  'offline.region.title': 'Laajavuoren alue',
  'offline.region.detail': '{area} km² · {size} MB · ladattu',
  'offline.cached': 'Välimuistissa',
  'offline.tiles.title': 'Karttalaatat ja {count} aluetta',
  'offline.tiles.detail': 'Käytettävissä ilman verkkoa',
  'offline.forecast.title': 'Tämän päivän ennuste',
  'offline.forecast.detail': '{date} · tallennettu klo {time}',
  'offline.refresh.note': 'Päivitä ennusteet verkossa ennen lähtöä.',
  'offline.storage.label': 'Tallennustilaa käytössä',
  'offline.storage.value': '{used} / {total} MB',
  'offline.retry': 'Yritä synkronoida uudelleen',
  'offline.manage': 'Hallitse ladattuja alueita',
  'offline.lastSync': 'Viimeisin onnistunut synkronointi · {date} klo {time}',
  // The frame's own status message, drawn only when the device really reports no connection.
  'offline.status.title': 'Ei verkkoyhteyttä',
  'offline.status.body': 'Jatka poimintaa. Käynnit ja raportit tallennetaan puhelimeesi.',
  'offline.waiting.one': 'Odottaa synkronointia · {count} raportti',
  'offline.waiting.many': 'Odottaa synkronointia · {count} raporttia',
  'offline.row.title': 'Alue {zone} · {species}',
  'offline.row.meta': '{date} · {minutes} min · Sato {yield} / {max} · {amount}',
  'offline.row.metaNoAmount': '{date} · {minutes} min · Sato {yield} / {max}',
  'offline.row.chip': 'Jonossa · käynti ja raportti',
  'offline.note':
    'Tallennettu tähän puhelimeen. Mitään ei ole lähetetty — synkronointi tulee palvelimen myötä.',
  'offline.empty': 'Mitään ei odota synkronointia.',

  // Screen 11. The eyebrow keeps the frame's own words and adds “KAUSIDEMO”, the same disclosure
  // frame 06's eyebrow carries about its map: the month's figures are the design's sample, not
  // the picker's own data. “Käynti” is the visit the other core-picker screens already call it.
  'discover.season.eyebrow': 'POIMINTA · HENKILÖKOHTAISET TIEDOT · KAUSIDEMO',
  'discover.season.title': 'Kautesi tähän mennessä',
  'discover.season.period.month': 'Elokuu 2026',
  'discover.season.period.all': 'Kaikki käynnit',
  // The two chips are one real choice, so the group carries its own name, and the lines under
  // “Käyntihistoria” state what it shows: the period and its count, and — under the month chip
  // only — how many visits it leaves out.
  'discover.season.period.label': 'Käyntien aikajakso',
  'discover.season.history.shown.one': '{period} · 1 käynti',
  'discover.season.history.shown.many': '{period} · {count} käyntiä',
  'discover.season.history.outside.one': '1 käynti tämän jakson ulkopuolella',
  'discover.season.history.outside.many': '{count} käyntiä tämän jakson ulkopuolella',
  'discover.season.summary': 'Hyvä kuukausi metsässä.',
  'discover.season.metric.harvested': 'Sato yhteensä',
  'discover.season.metric.rate': 'kg / tunti',
  'discover.season.metric.zones': 'Alueita käyty',
  'discover.season.metric.stay': 'Aikaa alueilla',
  'discover.season.metric.median': 'Mediaanikesto',
  'discover.season.chart.title': 'Sato käynneittäin',
  'discover.season.chart.unit': 'kg',
  'discover.season.history.title': 'Käyntihistoria',
  'discover.season.row.title': 'Alue {zone} · {species}',
  'discover.season.row.queued': 'Jonossa',
  'discover.season.row.synced': 'Synkronoitu',
  'discover.season.note':
    'Sisältää jonossa olevan käyntisi. Satoasteet lasketaan vain käynneistä, joilla on kirjattu määrä.',

  // The frame labels this row “Käyntien taustaseuranta”; the switch withdraws the consent screen
  // 05 collects, which is tracking while the app is open (ADR-047). Measured: the row's own 244 px
  // label column holds one line in Finnish only as far as this, so the limit is “käytön aikana”
  // rather than the longer phrase the consent row once carried.
  'privacy.visitTracking': 'Käyntien seuranta käytön aikana',
  'privacy.sync.title': 'Offline-kartat ja synkronointi',
  'privacy.sync.value': '{count} jonossa',
  'privacy.eyebrow': 'TILI / OFFLINE · ASETUKSESI',
  'privacy.saveFailed': 'Valintaasi ei voitu tallentaa.',
  // The profile whose settings this screen holds; the frame's own heading is “Private by nature”
  // (see the English catalogue's note and docs/design-source.md).
  'privacy.title': 'Profiili',
  'privacy.trailsNote.body':
    'Näkyvyys koskee paikkoja, ei reittiäsi. Tarkkoja reittejä ei näytetä muille.',
  'privacy.trailsNote.title': 'GPS-reitit eivät ole koskaan julkisia',
  // Frame 14's account row (see the English catalogue). “Sähköposti” and “Puhelin” are the words
  // screen 03's own fields use, so the line names the same thing the form asked for.
  'privacy.account.line': '{identifier} · {verified}',
  'privacy.account.readFailed': 'Tiliäsi ei voitu lukea.',
  'privacy.account.verifiedEmail': 'Sähköposti vahvistettu',
  'privacy.account.verifiedPhone': 'Puhelin vahvistettu',
  // “Käytä Pickyä” is the frame's “Use Picky as”; the chips are its answer in the essive, the case
  // a Finnish reader expects under a heading that asks what the app is used as.
  'privacy.useAs.title': 'Käytä Pickyä',
  'privacy.useAs.picker': 'Poimijana',
  'privacy.useAs.buyer': 'Ostajana',
  // The frame's own note. “Suunniteltu lisäosa” is the phrase the marketplace's disclosure chip
  // already uses, so one claim does not become two.
  'privacy.useAs.note': 'Sama tili. Ostaminen on suunniteltu markkinapaikan lisäosa.',
  // Frame 14's “Saved spots”, which screen 03's privacy line already calls “Tallennetut paikat”.
  // The eyebrow no longer repeats the demo disclosure frame 06's map carries (“KAUSIDEMO”): since
  // ADR-060 the rows are source zones, and an id the source cannot describe is printed alone.
  'privacy.savedSpots.eyebrow': 'TILI / OFFLINE · TALLENNETUT PAIKAT',
  'privacy.savedSpots.title': 'Tallennetut paikat',
  // The frame's own subtitle under the row's label (“4 spots · private by default”). The clause is
  // the one screen 03's privacy promise already makes (“… ovat oletuksena yksityisiä”), in the
  // case the count before it asks for — a numeral one takes the singular.
  'privacy.savedSpots.subtitle.one': '{count} paikka · oletuksena yksityinen',
  'privacy.savedSpots.subtitle.many': '{count} paikkaa · oletuksena yksityisiä',
  'privacy.savedSpots.empty': 'Ei vielä tallennettuja paikkoja.',
  'privacy.savedSpots.browse': 'Selaa alueita',
  'privacy.savedSpots.readFailed': 'Tallennettuja paikkoja ei voitu lukea.',
  // The row names the language the app is in, so this catalogue says its own name.
  'privacy.language.title': 'Kieli',
  'privacy.language.value': 'Suomi',
  'privacy.signOut': 'Kirjaudu ulos',
  'privacy.signOut.failed': 'Uloskirjautuminen ei onnistunut. Mitään ei poistettu.',

  // Frame 14's two app-drawn rows and the screens behind them (ADR-039). Each screen's title is
  // also the frame's row label, as the saved-plan list's is.
  'privacy.accountSecurity.eyebrow': 'TILI / OFFLINE · TILI JA TURVALLISUUS',
  'privacy.accountSecurity.title': 'Tili ja turvallisuus',
  'privacy.accountSecurity.intro': 'Mitä sovellus tietää tilistäsi ja mikä pitää sen tallessa.',
  'privacy.accountSecurity.none':
    'Istuntoa ei ole käytössä. Istunto kestää tunnin siitä hetkestä, kun kirjaudut sisään.',
  'privacy.accountSecurity.reach.title': 'Sähköposti ja salasana ovat avain',
  'privacy.accountSecurity.reach.body':
    'Sisäänkirjautuminen pyytää sähköpostin ja salasanan. Sovellus ei tallenna omaa salasanaa, eikä tilipalvelua ole vielä kytketty tarkistamaan sitä.',
  'privacy.accountSecurity.session.title': 'Istunto',
  'privacy.accountSecurity.session.where.label': 'Missä se on',
  'privacy.accountSecurity.session.where.value':
    'Sovelluksen muistissa, niin kauan kuin sovellus on auki.',
  'privacy.accountSecurity.session.where.hint':
    'Puhelimeen ei kirjoiteta vielä mitään: korvikkeen takana oleva varasto on muistissa, ja suojattu varasto tulee tilipalvelun mukana.',
  'privacy.accountSecurity.session.lifetime.label': 'Kuinka kauan se kestää',
  'privacy.accountSecurity.session.lifetime.value': 'Tunnin siitä hetkestä, kun kirjaudut sisään.',
  'privacy.accountSecurity.session.lifetime.hint':
    'Tunti on palveluntarjoajan oma tunnisteen voimassaoloaika, ei meidän valintamme.',
  'privacy.accountSecurity.session.ends.label': 'Mikä sen päättää',
  'privacy.accountSecurity.session.ends.value': 'Uloskirjautuminen tai tunnin päättyminen.',
  'privacy.accountSecurity.session.ends.hint':
    'Vanhentunut istunto pudotetaan, kun sovellus lukee sen seuraavan kerran.',
  'privacy.accountSecurity.session.remaining.label': 'Aikaa jäljellä',
  'privacy.accountSecurity.session.remaining.value': '{minutes} min',
  'privacy.accountSecurity.session.remaining.underMinute': 'Alle minuutti',
  'privacy.accountSecurity.session.remaining.hint':
    'Luetaan istunnon omasta päättymisajasta, kerran sekunnissa. Mikään täällä ei pidennä sitä — päättyneeseen istuntoon kirjaudutaan uudelleen.',
  'privacy.accountSecurity.ended.title': 'Istunto on päättynyt',
  'privacy.accountSecurity.ended.body':
    'Sisäänkirjautumisen jälkeen alkanut tunti on kulunut, joten sovellus ei enää pidä tiliä.',
  'privacy.accountSecurity.absent.title': 'Ei vielä täällä',
  'privacy.accountSecurity.absent.service':
    'Tilipalvelua ei ole kytketty, joten nimeäsi ja sähköpostiosoitettasi ei voi vielä muuttaa sovelluksessa eikä tiliä voi poistaa.',
  'privacy.accountSecurity.absent.devices': 'Laitelistaa ei ole, eikä toista istuntoa voi päättää.',
  'privacy.accountSecurity.signOut.note':
    'Uloskirjautuminen poistaa tältä puhelimelta käyntien seurannan suostumuksen, tallennetut paikat ja jonossa olevat raportit ja pudottaa sitten istunnon.',

  // The notice, in the app's own words (ADR-039). Terms and a privacy notice are not invented
  // here; the last card says what is still owed instead.
  'privacy.termsPrivacy.eyebrow': 'TILI / OFFLINE · KÄYTTÖEHDOT JA TIETOSUOJA',
  'privacy.termsPrivacy.title': 'Käyttöehdot ja tietosuoja',
  'privacy.termsPrivacy.intro':
    'Mitä tällä puhelimella on, miksi kukin tieto on olemassa ja miten se poistuu.',
  'privacy.termsPrivacy.held.title': 'Tällä puhelimella',
  'privacy.termsPrivacy.held.empty': 'Sinusta ei ole vielä mitään tällä puhelimella.',
  'privacy.termsPrivacy.held.readFailed':
    'Kaikkea puhelimen sisältöä ei voitu lukea, joten alla oleva luettelo on puutteellinen.',
  'privacy.termsPrivacy.record.account.label': 'Tilisi',
  'privacy.termsPrivacy.record.account.value':
    'Nimi, jolla loit tilin, sekä osoite tai numero, jonka syötit.',
  'privacy.termsPrivacy.record.account.hint':
    'Vain sovelluksen muistissa: sovelluksen sulkeminen hävittää sen, ja uloskirjautuminen pudottaa sen myös.',
  // The English label is “Visit tracking consent”; the Finnish kept the frames' heavier word after
  // the copy changed, which the claims guard found (ADR-047, docs/copy-claims-audit.md).
  'privacy.termsPrivacy.record.consent.label': 'Käyntien seurannan suostumus',
  'privacy.termsPrivacy.record.consent.value':
    'Se, suostuitko käyntien seurantaan, ja milloin päätit niin.',
  'privacy.termsPrivacy.record.consent.hint':
    'Muutetaan yksityisyysasetuksissa; pois kytkeminen kirjoittaa kieltäytymisen suostumuksen tilalle.',
  'privacy.termsPrivacy.record.plan.label': 'Tallennetut paikat',
  'privacy.termsPrivacy.record.plan.value': 'Tallentamasi alueet tunnisteinaan.',
  'privacy.termsPrivacy.record.plan.hint':
    'Poistetaan alueen oman näkymän kirjanmerkillä; uloskirjautuminen poistaa koko luettelon.',
  'privacy.termsPrivacy.record.queue.label': 'Synkronointia odottavat käynnit',
  'privacy.termsPrivacy.record.queue.value':
    'Raportit, joita tämä puhelin pitää sisällään, ja niihin kirjoittamasi tiedot.',
  'privacy.termsPrivacy.record.queue.hint':
    'Luetteloissa synkronointikeskuksessa; uloskirjautuminen poistaa ne.',
  'privacy.termsPrivacy.rights.title': 'Oikeutesi ja missä ne ovat',
  'privacy.termsPrivacy.rights.see.label': 'Katsoa',
  'privacy.termsPrivacy.rights.see.value':
    'Jokainen yllä oleva tieto on luettavissa siellä, missä se on: paikat Tallennetut paikat -näkymässä, raportit synkronointikeskuksessa, suostumus ja tili täällä.',
  'privacy.termsPrivacy.rights.copy.label': 'Ottaa kopion',
  'privacy.termsPrivacy.rights.copy.value':
    'Kopio otetaan näkymässä Omat tietosi: yksi tiedosto, joka sisältää yllä olevat tiedot ja luovutetaan laitteen omaan jakovalikkoon.',
  'privacy.termsPrivacy.rights.correct.label': 'Korjata',
  'privacy.termsPrivacy.rights.correct.value':
    'Tallennettu paikka korjataan poistamalla se; tilin omia tietoja ei voi vielä muuttaa, koska niitä hallinnoivaa palvelua ei ole.',
  'privacy.termsPrivacy.rights.delete.label': 'Poistaa',
  'privacy.termsPrivacy.rights.delete.value':
    'Uloskirjautuminen poistaa kaikki yllä olevat tiedot tältä puhelimelta.',
  'privacy.termsPrivacy.leaves.title': 'Mikään ei lähde tältä puhelimelta',
  'privacy.termsPrivacy.leaves.body':
    'Tilipalvelua, aluelähdettä eikä sääpalvelua ole kytketty, joten sovellus ei lähetä mitään minnekään. Sen pitämiä raportteja ei ole koskaan siirretty palvelimelle.',
  'privacy.termsPrivacy.notice.title': 'Kirjallinen ilmoitus',
  'privacy.termsPrivacy.notice.body':
    'Tietosuojailmoitus ja käyttöehdot ovat vielä kirjoittamatta, ja tämä näkymä on se paikka, johon ne tulevat. Sen, mitä sovellus voi tänään kertoa, näet yltä: pitämänsä tiedot, miksi kukin on olemassa ja miten se poistetaan.',

  // The export path open question 23 names as owed, and the screen it is used from — drawn from the
  // app's own vocabulary because the design never drew it. What can leave the phone is the user's own
  // choice in the platform's sheet; nothing the app does sends anything.
  'privacy.export.eyebrow': 'TILI / OFFLINE · OMAT TIETOSI',
  'privacy.export.title': 'Omat tietosi',
  'privacy.export.intro':
    'Kopio siitä, mitä tämä puhelin säilyttää, muodossa jonka toinen työkalu voi lukea.',
  'privacy.export.contents.title': 'Mitä kopio sisältää',
  'privacy.export.contents.empty':
    'Sinusta ei ole vielä mitään tällä puhelimella, joten kopio olisi tyhjä.',
  'privacy.export.contents.consent.on': 'Käyntien seuranta päällä',
  'privacy.export.contents.consent.off': 'Käyntien seuranta pois päältä',
  'privacy.export.format.title': 'Tiedosto',
  'privacy.export.format.body':
    'Yksi JSON-asiakirja: muodon nimi, kopion tekohetki ja alla olevat tietueet kokonaan. Siinä ei ole mitään, mitä sovelluksella ei ole — ei salasanaa eikä avainta, koska sovelluksella ei ole niitä.',
  'privacy.export.share.label': 'Jaa kopio',
  'privacy.export.share.noteTitle': 'Minne kopio menee',
  'privacy.export.share.note':
    'Laitteen oma jakovalikko avautuu, ja sinä valitset, minne kopio menee. Sovellus ei lähetä mitään itse.',
  'privacy.export.share.shared': 'Kopio luovutettiin jakovalikkoon.',
  'privacy.export.share.dismissed': 'Jakovalikko suljettiin valitsematta kohdetta.',
  'privacy.export.share.failed': 'Kopiota ei voitu luovuttaa.',

  // Frames 15–18, the planned marketplace as a demo. The frame's own disclosure is kept in words
  // a reader cannot miss: nothing here charges, sends or receives anything.
  'market.disclosure': 'Suunniteltu lisäosa',

  // Screen 15.
  'market.eyebrow.browse': 'SUUNNITELTU MARKKINAPAIKKA · YTIMEN ULKOPUOLELLA',
  'market.browse.mode': 'Ostotila · Esikatselu',
  'market.title.browse': 'Lähiseudun sato',
  'market.search.placeholder': 'Marjoja Jyväskylän läheltä',
  'market.filter.all': 'Kaikki marjat',
  'market.filter.pickup': 'Nouto',
  'market.filter.distance': '10 km säteellä',
  // The frame's “Browse 12 local listings” with the app's own number in it, so the sentence and
  // the count the search leaves cannot disagree; Finnish writes the same word for both numbers.
  'market.browse.count.one': 'Selaa {count} paikallista ilmoitusta',
  'market.browse.count.many': 'Selaa {count} paikallista ilmoitusta',
  'market.browse.none': 'Ei hakutuloksia.',
  'market.card.price': '{amount} € / kg',
  'market.card.available': '{available} kg saatavilla · {place}',
  'market.card.availableAway': '{available} kg saatavilla · {place}, {distance} päässä',
  'market.card.seller': '{name} · {rating} · {reviews} arvostelua',
  'market.card.open': 'Avaa {name}',

  // Screen 16.
  'market.eyebrow.listing': 'SUUNNITELTU MARKKINAPAIKKA · ILMOITUS',
  'market.listing.headline': 'Metsästä pöytääsi.',
  'market.listing.price': '{amount} €/kg',
  'market.listing.stock': '{species} · {available} kg saatavilla',
  'market.listing.blurb':
    'Käsin poimittu tänään, lajiteltu ja pidetty viileänä. Suomalaisia metsämustikoita, täynnä metsän makua.',
  'market.listing.harvested': 'Poimittu {date}',
  'market.listing.pickup': 'Nouto · {place} {window}',
  // The frame's own delivery line (272x18, node `5:23866`) is one line, and the app draws it in a
  // 13 px slot beside its truck glyph: “Paikallinen toimitus sopimuksen mukaan chatissa” needs
  // three lines there. The wording keeps what the line is for — delivery is agreed, not booked.
  'market.listing.delivery': 'Toimitus sopimuksen mukaan chatissa',
  'market.seller.badge': 'Vahvistettu myyjä',
  'market.seller.meta': 'Vahvistettu myyjä · {rating} / 5 · {reviews} arvostelua',
  'market.seller.metaUnverified': '{rating} / 5 · {reviews} arvostelua',
  'market.listing.contact': 'Ota yhteyttä',
  'market.listing.contactA11y': 'Ota yhteyttä: {name}',
  'market.listing.order': 'Tilaa marjoja',
  'market.listing.escrow':
    'Suunniteltu palveluntarjoajan escrow pitää maksun suojattuna, kunnes vahvistat toimituksen.',

  // Screen 17. The sample exchange, in Finnish.
  'market.eyebrow.chat': 'SUUNNITELTU MARKKINAPAIKKA · MYYJÄN CHAT',
  'market.chat.listing': '{name} · {price}',
  'market.chat.listingMeta': '{available} kg saatavilla · {place}',
  'market.chat.stamp': '{date}',
  'market.chat.ask': 'Moi Matti! Saisinko 5 kg mustikoita tänä iltana?',
  'market.chat.reply': 'Totta kai! Se tekee 40 €. Nouto Laajavuoren parkkipaikalta klo 17–19.',
  'market.chat.confirm': 'Hienoa. Olen siellä klo 18.30.',
  'market.chat.pack': 'Hyvä, pakkaan sinulle 5 kg. Tee tilaus Pickyssä, niin maksu pysyy turvassa.',
  'market.chat.read': 'Luettu',
  'market.chat.author.picker': 'Sinä',
  'market.chat.author.seller': 'Myyjä',
  'market.chat.messageA11y': '{author}: {text}',
  'market.chat.summary': 'Näytä tilausyhteenveto · {total} €',
  'market.chat.composer': 'Kirjoita viesti…',

  // Screen 18.
  'market.eyebrow.order': 'SUUNNITELTU MARKKINAPAIKKA · DEMOTILAUS',
  'market.order.title': 'Marjasi on varattu',
  'market.order.testMode': 'Palveluntarjoajan testitila',
  'market.order.confirmed.title': 'Testitilaus vahvistettu',
  'market.order.confirmed.body':
    'Oikeaa rahaa ei veloitettu. Demomaksu on palveluntarjoajan hallussa.',
  'market.order.by': '{seller} · Poimittu {date}',
  'market.order.line': '{kilograms} kg × {unit}',
  'market.order.delivery': 'Nouto · ei toimitusmaksua',
  'market.order.total': 'Pidossa yhteensä',
  'market.price.symbol': '{amount} €',
  'market.order.pickup.title': 'Nouto: {name}',
  'market.order.pickup.meta': '{date} · klo {time} {place}, {town}',
  'market.order.status.confirmed': 'Tilaus vahvistettu · maksu pidossa',
  'market.order.status.waiting': 'Odottaa noutovahvistusta',
  'market.order.hold.title': 'Vahvista vasta, kun olet saanut marjasi',
  // The frame's hold message is two lines in its 282 px box (node `5:23987`) and the Finnish of the
  // first wording needed three. Same claim, the seller named in fewer words.
  'market.order.hold.body':
    'Maksu on pidossa, kunnes vahvistat toimituksen. Se vapautuu myyjälle {name}.',
  'market.order.message': 'Viesti myyjälle {name}',
  'market.order.disputeNote': 'Ongelma tilauksessa? Riita pitää maksun pidossa käsittelyn ajan.',
};
