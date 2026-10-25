/**
 * The source language. Every string the app shows is written here first, in the
 * wording the design gives it, and every other catalogue is typed against this one —
 * so a missing translation is a compile error, not a blank label.
 *
 * Keys are dotted and screen-scoped (`onboarding.welcome.title`). Strings that carry
 * runtime values use `{name}` placeholders; none do yet, and the catalogue test keeps
 * placeholders in step across locales once they appear.
 *
 * A key is added here when a screen needs it, and deleted from here — and from every
 * other catalogue — when nothing renders it any more: the catalogue test fails when no
 * source file names a key, so dead copy cannot accumulate.
 */
export const en = {
  'common.back': 'Back',
  // The report queue's read failure, shared by the two screens that list it (frame 11's visit
  // history and frame 13's sync centre). Written here rather than in the design: neither frame
  // has a failure state, and a store the device will not let the app read must never be shown as
  // an empty list the user did not write (the same reason screens 10 and 14 report their writes).
  'common.readFailed': 'Your saved visits could not be read.',
  // A store still being read is not an empty one: screens say this rather than a count of zero.
  'common.loading': 'Loading…',
  'common.on': 'On',
  'common.off': 'Off',
  // The route error boundary (frontend review, 2026-10-25). It says the data on the phone is
  // untouched and gives a way out; it never prints the thrown error.
  'error.eyebrow': 'PICKY · SOMETHING WENT WRONG',
  'error.title': 'This screen hit a problem',
  'error.body':
    'Nothing was lost: your saved spots and reports are still on this phone. Try again, or go back.',
  'error.retry': 'Try again',
  'error.home': 'Go back',
  'common.hidePassword': 'Hide password',
  'common.showPassword': 'Show password',

  // The core navigation the design draws on frames 06–14. The frame names its four destinations
  // in English only, and the bar itself has no label at all — a screen reader needs one to say
  // what the four tabs are a set of, so it is written here rather than extracted.
  'navigation.label': 'Main navigation',
  'navigation.discover': 'Discover',
  'navigation.visits': 'Visits',
  'navigation.alerts': 'Alerts',
  // The frame's own word, and the owner's (2026-10-22): the destination is the picker's profile,
  // and the settings live inside it rather than being the destination itself.
  'navigation.profile': 'Profile',

  'app.notFound.action': 'Go to the home screen',
  'app.notFound.subtitle': 'This route does not exist.',
  'app.notFound.title': 'Screen not found',

  'onboarding.welcome.action': 'Get started',
  'onboarding.welcome.eyebrow': 'ONBOARDING · 01 / 05',
  'onboarding.welcome.footer': 'Made for Finland’s berry season · EN / FI',
  'onboarding.welcome.headline': 'Find. Pick. Share. Sustain.',
  'onboarding.welcome.signIn': 'Already have an account? Sign in',
  'onboarding.welcome.supporting':
    'Find promising berry spots in Finland, follow the season, and help keep the forest map fresh.',
  'onboarding.welcome.tag.freshInsights': 'Fresh insights',
  'onboarding.welcome.tag.offlineReady': 'Offline ready',
  'onboarding.welcome.tag.privateByNature': 'Private by nature',
  'onboarding.welcome.title': 'Welcome to the outdoors',

  // The sign-in screen, which the design never drew: the design owner chose the screen's shape
  // (ADR-034), and its words are this repository's rather than a frame's. Since 2026-10-24 it
  // collects the account's own credential — email + password (ADR-054, ADR-059) — so the action
  // says what the press does and the failure line says what a refusal means.
  'onboarding.signIn.action': 'Sign in',
  'onboarding.signIn.createAccount': 'I don’t have an account yet',
  'onboarding.signIn.email': 'Email address',
  'onboarding.signIn.eyebrow': 'ONBOARDING · SIGN IN',
  'onboarding.signIn.failed': 'That email and password didn’t match. Try again.',
  'onboarding.signIn.forgotPassword': 'Forgot password?',
  'onboarding.signIn.heading': 'Welcome back.',
  'onboarding.signIn.password': 'Password',
  'onboarding.signIn.supporting': 'Enter the email and password you signed up with.',
  'onboarding.signIn.title': 'Sign in',

  // The password-reset journey the design never drew (ADR-062, answering ADR-034 §1.5). Its
  // framing is the sign-in screen's, and its words are this repository's. **No string claims a
  // delivery**: the sign-in service owns the link, no service is connected, and the test-build
  // note says no email is sent — the rule ADR-048 set for the retired code screen.
  'onboarding.forgotPassword.action': 'Request reset link',
  'onboarding.forgotPassword.eyebrow': 'ONBOARDING · PASSWORD RESET',
  'onboarding.forgotPassword.failed': 'The reset link couldn’t be requested. Try again.',
  'onboarding.forgotPassword.heading': 'Forgot your password?',
  'onboarding.forgotPassword.requested.another': 'Use a different address',
  'onboarding.forgotPassword.requested.body':
    'If an account uses {email}, the sign-in service’s reset link is the next step for that address. The app never stores your password.',
  'onboarding.forgotPassword.requested.heading': 'Reset request accepted.',
  'onboarding.forgotPassword.requested.live.body':
    'If an account uses {email}, the sign-in service’s reset link is on its way to that address. The app never stores your password.',
  'onboarding.forgotPassword.requested.live.heading': 'Check your inbox.',
  'onboarding.forgotPassword.requested.test.body':
    'No sign-in service is connected here, so no reset email is sent. In the finished app, the link would go to this address.',
  'onboarding.forgotPassword.requested.test.title': 'Test build',
  'onboarding.forgotPassword.supporting':
    'Enter the email your account uses. Reset links belong to the sign-in service; the app never stores your password.',
  'onboarding.forgotPassword.title': 'Reset password',

  'onboarding.createAccount.action': 'Create account',
  'onboarding.createAccount.consent':
    'I agree to the Terms of use and acknowledge the Privacy notice.',
  'onboarding.createAccount.eyebrow': 'ONBOARDING · 03 / 05',
  'onboarding.createAccount.field.email': 'Email address',
  'onboarding.createAccount.field.name': 'Your name',
  'onboarding.createAccount.field.password': 'Password',
  'onboarding.createAccount.failed': 'Your account wasn’t created. Try again.',
  'onboarding.createAccount.heading': 'A little introduction.',
  'onboarding.createAccount.passwordHint': 'At least 8 characters, with a number.',
  'onboarding.createAccount.privacy.body':
    'Saved spots default to private. Your GPS trails are never public.',
  'onboarding.createAccount.privacy.title': 'Your data stays yours',
  'onboarding.createAccount.readTerms': 'Read terms & privacy',
  'onboarding.createAccount.signIn': 'Already registered? Sign in',
  'onboarding.createAccount.supporting': 'Save your spots and keep your picking history together.',
  'onboarding.createAccount.title': 'Create your account',

  // The frame's own label reads “Continue to location settings”, and no such screen exists: the
  // consent is recorded here, and the platform's permission is asked in the app the first time a
  // screen reads a position (ADR-045). So the action says what the press does — it opens the map
  // this screen draws above it (ADR-050, which closes known issue 33 and keeps the frame's words
  // as the label for the journey that really does open a settings surface).
  'onboarding.location.action': 'Continue to the map',
  'onboarding.location.benefit.nearby.body': 'Precise location while you use Picky.',
  'onboarding.location.benefit.nearby.title': 'Nearby spots & directions',
  // The frame promises timing “even with the screen locked”; the app reads a position in the
  // foreground only (ADR-045), so the benefit says what it does instead of what the frame drew.
  // The words are this repository's — the design's promise is withdrawn from the copy and put to
  // the owner as a decision rather than shipped as a feature (ADR-047).
  'onboarding.location.benefit.timing.body':
    'With your consent, visit timing runs only while the app is open.',
  'onboarding.location.benefit.timing.title': 'Automatic visit timing',
  // The frame's own row reads “I consent to background visit tracking”. The app asks for what it
  // does — timing a visit while the app is open — because a consent to something the app cannot
  // do is not a consent anyone can check (AGENTS.md §11.1, ADR-047).
  'onboarding.location.consent':
    'I consent to visit tracking while the app is open. I can turn it off in Privacy settings.',
  'onboarding.location.eyebrow': 'ONBOARDING · 05 / 05',
  'onboarding.location.heading': 'Let the forest find you.',
  'onboarding.location.reassurance': 'Your exact GPS tracks are never shown to other people.',
  'onboarding.location.skip': 'Not now · browse without tracking',
  'onboarding.location.supporting':
    'Location helps show nearby zones and recognise when you arrive and leave.',
  'onboarding.location.title': 'Find your bearings',

  // Screen 06's map. The place and lake names are the frame's own — its map is a season
  // demo and says so — and they live here rather than in the drawing so they can be
  // translated, read out and measured like every other string (docs/design-source.md).
  'discover.eyebrow': 'CORE PICKER · SEASON DEMO / 28 AUG',
  'discover.title': 'Discover nearby',
  'discover.map.label': 'Map of nearby berry zones',
  'discover.map.place': 'Laajavuori',
  'discover.map.lake': 'Tuomiojärvi',
  'discover.map.position': 'Position marker on the map',
  'discover.map.scale': '━━  200 m   ·   Season demo',
  // The real map's own lines (screen 06 — frames 08 and 09 still draw the design's map). The
  // count says the zones are the pilot's **test data**, because they are the data team's stub,
  // not pickers' reports (docs/demo-and-stand-ins.md). `updated` is also screen 07's freshness
  // line for the one zone it draws: the same data, so the same words rather than a second key.
  'discover.map.count': '{count} zones · test data',
  'discover.map.countOne': '{count} zone · test data',
  'discover.map.updated': 'Last updated {date}',
  'discover.map.loading': 'Loading zones…',
  'discover.map.unavailable': 'Zones could not be read',
  'discover.map.empty': 'No zones to show',
  // The retry the error line owes the picker: waiting is not the only option when the source
  // failed once (frontend review, 2026-10-25).
  'discover.map.retry': 'Try again',
  // Expo Go has no MapLibre native binary (ADR-031). The map says so instead of letting the
  // package's import-time native-module lookup take the app down; the rest of the screen — the
  // card, the list and the filters — still reads the same zones.
  'discover.map.requiresDevelopmentBuild':
    'The map isn’t available in this build. Use a development build to see it.',
  // What the five colours mean. The ranges themselves are numbers rather than copy, so they
  // are written by the legend; these two lines are the words a reader needs.
  'discover.score.label': 'Yield score',
  'discover.score.lowConfidence': 'Faded zones have low confidence',
  // The zone's own name is visible text; its state is not, and colour alone cannot carry it
  // to a screen reader, so the label's accessible name spells the state out.
  'discover.zone.a11y': 'Zone {id}, {state}',
  'discover.zone.score.a11y': 'Zone {id}, yield score {score} out of 100',
  'discover.legend.label': 'Zone states',
  'discover.legend.unpicked': 'Unpicked',
  'discover.legend.recentlyPicked': 'Picked recently',
  'discover.legend.ripening': 'Ripening',
  // The design's sample zones still use this label — the saved plan's rows and screen 07's
  // own zone; screen 06 no longer draws them (its card and rows read the ZoneSource instead).
  'discover.card.title': 'Zone {zone} · {species}',
  // Screen 06's card and list rows, over the source: the zone's own name and the berry whose
  // score is read are both values from the payload, not part of the sentence.
  'discover.card.zoneTitle': '{zone} · {species}',
  // The design's demo card (the community-map prototype): the frame's own values, kept for
  // the one reading that still draws the demo composition.
  'discover.card.place': 'Laajavuori · 1.4 km walk',
  'discover.card.yield': '78 / 100 yield',
  'discover.card.confidence': 'High confidence',
  'discover.card.status': 'Unpicked · Ripe · Report updated 38 min ago',
  // The caption under the source card's name: the same disclosure the map carries, so a
  // picker reading the card knows the numbers are the data team's stub and not reports.
  'discover.card.source': 'Pilot area · test data',
  // The four words a source zone's season can be in — the card's third line and the list
  // rows' chip. The details screen keeps its own two ("Ripe now"), which describe a zone it
  // has a full reading for.
  'discover.ripeness.unripe': 'Not ripe yet',
  'discover.ripeness.ripening': 'Ripening now',
  'discover.ripeness.ripe': 'Ripe now',
  'discover.ripeness.past': 'Season over',
  // The card's accessible name once it leads somewhere. It says where the card goes rather
  // than reading out every value on it, which is what a screen reader would otherwise
  // announce as one button (frame 06's card opens frame 07's zone details).
  'discover.card.open': 'Open zone {zone} details',

  // The two controls above the map (frame 06, nodes `5:22955` and `5:22959`). The field
  // promises exactly what the filter can do — a place or a zone — and each chip names a
  // berry the app can name, in the words screen 10's report chips already use.
  'discover.search.placeholder': 'Search a place or zone',
  'discover.species.filter': 'Filter by species',
  // The row under the card (node `5:23008`): the frame's own words for the view the map is in
  // and the action that changes it, plus the glyph that opens frame 13's offline centre.
  'discover.view.mapStatus': 'Map selected',
  'discover.view.listStatus': 'Zone list',
  'discover.view.showList': 'Show zone list',
  'discover.view.showMap': 'Show map',
  'discover.downloads': 'Offline maps and downloads',
  // The list the toggle shows: one row per zone the filter kept.
  'discover.list.label': 'Nearby zones',
  'discover.list.yield': '{score} / {max} yield',
  // What the filter left, said under the two controls that narrowed it. The singular is a key
  // of its own because “1 zones match” is what a single `{count}` sentence prints, and the
  // count is a value this screen really does vary (unlike screen 07's week of reports).
  'discover.filter.matchOne': '1 zone matches',
  'discover.filter.matches': '{count} zones match',
  'discover.filter.none': 'No zone matches this search',

  // Screen 07 · Core picker · Zone details. The frame's own words, with the values it prints
  // as `{placeholders}`: the score, the week's report count, the temperature, the hour and
  // the reporter's own reading are data rather than copy, so a locale can order them.
  //
  // The eyebrow carries the disclosure frame 06's map carries (“SEASON DEMO”). A source zone's
  // name, species, score, confidence and season come from the zone port; the outlook, freshest
  // report, walk and report list have no source and stay the design's sample, which the
  // `sample` sentence says before them. The whole screen is the sample when no zone id is given,
  // which a bare URL alone reaches since the saved plan reads the source (ADR-060).
  'discover.details.eyebrow': 'CORE PICKER · ZONE INSIGHT · SEASON DEMO',
  // The title the screen can print before it knows a zone: loading, a failed read, or an id the
  // source does not answer to.
  'discover.details.pendingTitle': 'Zone details',
  'discover.details.unknown': 'This zone is not among the pilot zones this phone can read.',
  // The design's own two-chip title, still drawn for the no-zone sample path.
  'discover.details.title': 'Zone {zone} · {place}',
  'discover.details.hero': 'Berry season photograph',
  'discover.details.scoreLabel': '/ {max} yield score',
  'discover.details.confidence.high': 'High confidence',
  'discover.details.confidence.medium': 'Medium confidence',
  'discover.details.confidence.low': 'Low confidence',
  'discover.details.reportsThisWeek': '{count} reports this week',
  // The season words are the map screen's four (`discover.ripeness.*`), shared with the card
  // and the rows, so the details screen cannot name a season differently from the map.
  'discover.details.forecastDisclaimer': 'A forecast of conditions, not a guaranteed harvest.',
  // Said before the blocks no source supplies, so a picker reading a source zone's real score
  // knows where the outlook and the report stop being the app's own knowledge (the rule frame
  // 13's demo note follows).
  'discover.details.sample':
    'The outlook, the freshest report, the walk and the report list behind them are the design’s own sample: no weather source or report stream exists yet.',
  'discover.details.outlook.title': 'Today’s outlook',
  'discover.details.outlook.body':
    'Ripe lingonberries after a warm week. Similar conditions expected tomorrow.',
  'discover.details.weather': '{temperature}°C · {wind} · Forecast at {time}',
  'discover.details.wind.light': 'Light wind',
  'discover.details.wind.moderate': 'Moderate wind',
  'discover.details.wind.strong': 'Strong wind',
  'discover.details.reports.title': 'Fresh from pickers',
  'discover.details.reports.seeAll': 'See all {count}',
  // The link is a control only when the route gives it the list to open; its visible label stays
  // the frame's own, and the accessible name says where the press leads — the same treatment
  // frame 16's contact action gets (ADR-044).
  'discover.details.reports.seeAll.a11y':
    'See all {count} reports · opens the reports saved on this phone',
  'discover.details.reports.quote': '“Plenty of ripe clusters near the trail.”',
  'discover.details.reports.meta': '{trust} report · {minutes} min ago · {yield} / {max} yield',
  'discover.details.reports.scoring': 'Scores weight freshness, trust and nearby agreement.',
  'discover.details.reports.trust.trusted': 'Trusted',
  'discover.details.reports.trust.unverified': 'Unverified',
  // The action that opens screen 08, with the distance it names as a value: frame 07 draws it
  // as “Navigate · 1.4 km”, and frame 08's card prints the same number.
  // Frame 07's bookmark (node 5:23081). The visible control is a glyph, so the label is the
  // control's name and its next press's outcome; the saved state is also a shape (a filled
  // bookmark), never a colour alone.
  'discover.details.save': 'Save zone',
  'discover.details.save.saved': 'Remove zone from saved zones',
  'discover.details.saveFailed': 'This zone could not be saved or removed on this phone.',
  'discover.details.navigate': 'Navigate · {distance}',

  // The list frame 07's “See all 11” opens — **app-drawn**, because the design never drew the
  // list its own link names (ADR-044). The frame's own eleven are its sample week, read from the
  // zone's figures rather than repeated; the count under them is what this phone holds.
  'discover.zoneReports.eyebrow': 'CORE PICKER · ZONE REPORTS · SEASON DEMO',
  'discover.zoneReports.title': 'Zone {zone} · reports',
  'discover.zoneReports.intro':
    'The design’s sample week holds {count} reports from pickers nearby. This app holds only what was saved on this phone:',
  'discover.zoneReports.held.one': '1 report on this phone',
  'discover.zoneReports.held.many': '{count} reports on this phone',
  // A report's own line, in the frame's own order of facts: its day, its length, the rating the
  // picker gave on the design's 1–5 scale, and the harvest they typed. A report saved without a
  // harvest uses `metaNoAmount` rather than printing a zero nobody recorded.
  'discover.zoneReports.row.meta': '{date} · {minutes} min · Yield {yield} / {max} · {amount}',
  'discover.zoneReports.row.metaNoAmount': '{date} · {minutes} min · Yield {yield} / {max}',
  'discover.zoneReports.empty': 'No report for this zone is saved on this phone yet.',
  // The design's eleven include other pickers' reports, and nothing returns one: the screen names
  // the service that would rather than standing the sample in for it.
  'discover.zoneReports.missing':
    'Reports from other pickers arrive with the report service, which this app does not have yet.',

  // Screen 08 · Core picker · Route to zone. The distances are values (`formatDistance`), and
  // so is the turn's direction: the sentence around them is the language's own.
  //
  // The frame leads with “Map ready offline” and promises a downloaded tile cache. The app has
  // no tile cache and downloads nothing, so the note says what it can be true about — the
  // boundaries it draws are data on the device — and names the cache as the thing still
  // missing. A note claiming a download that never happened is worse than no note.
  'discover.route.eyebrow': 'CORE PICKER · WALKING ROUTE · SEASON DEMO',
  'discover.route.title': 'To Zone {zone}',
  'discover.route.offline.title': 'Map drawn on this device',
  'discover.route.offline.body':
    '{place}: zone boundaries are drawn on this device. Map tiles aren’t downloaded yet.',
  'discover.route.distance': 'Walking distance',
  'discover.route.duration': '{minutes} min',
  'discover.route.arrival': 'Estimated arrival · {time}',
  'discover.route.guidance.title': 'Follow the forest trail',
  'discover.route.guidance.detail': 'Keep {direction} in {distance}, toward {place}',
  'discover.route.turn.left': 'left',
  'discover.route.turn.right': 'right',
  'discover.route.supporting':
    'Stay on marked trails where possible. Route estimates may vary with forest terrain.',
  'discover.route.cancel': 'Cancel route',
  // Screen 07's action again, now that it has somewhere to go (screen 09 exists).
  'discover.route.start': 'Start walking',

  // Screen 09 · Core picker · Active visit. The timer is a value (`formatElapsed`), as is the
  // arrival time the status message names; the species in the status label is the design's own
  // demo sentence, like the zone card's, and becomes a value of its own with a zone source.
  // The visit being timed is that same demo, so the eyebrow names it.
  'discover.visit.eyebrow': 'CORE PICKER · VISIT IN PROGRESS · SEASON DEMO',
  'discover.visit.title': 'Picking in Zone {zone}',
  'discover.visit.arrived.title': 'Arrival detected automatically',
  'discover.visit.arrived.body':
    'You entered the zone at {time}. Timing runs while the app is open.',
  'discover.visit.status': 'ACTIVE · LINGONBERRY',
  'discover.visit.timerHint': 'Time in zone · no signal needed',
  'discover.visit.privacy':
    'Only you can see your track. Others see zone status, never your exact GPS trail.',
  'discover.visit.pause': 'Pause visit',
  'discover.visit.resume': 'Resume visit',
  'discover.visit.end': 'End visit',
  'discover.visit.supporting':
    'Leaving the mapped area ends the visit automatically and prompts your quick report.',

  // Screen 10 · Core picker · Post-visit feedback. The visit's own window and the harvest are
  // values; the species names and the five rating words are the design's own copy. The visit
  // the summary describes is the design's sample (its window, and its 28 Aug), so the eyebrow
  // names the demo; what the picker answers below it is their own and is saved on the device.
  'report.eyebrow': 'CORE PICKER · QUICK REPORT · SEASON DEMO',
  'report.title': 'How was the picking?',
  'report.exit.title': 'Exit detected · visit complete',
  'report.exit.body': 'Zone {zone} · 28 Aug · {arrival}–{departure} · {minutes} min',
  'report.heading': 'A small report. A fresher map.',
  'report.supporting': 'Rate the berries you found, not just the amount you brought home.',
  'report.species.label': 'Species of this report',
  'report.species.lingonberry': 'Lingonberry',
  'report.species.bilberry': 'Bilberry',
  // Frame 06's third chip; frame 10's third chip reveals it (see the two keys below).
  'report.species.cloudberry': 'Cloudberry',
  // The pilot's fourth species (CONTEXT.md §7 at the repository root). The frame draws no chip
  // for it, so it follows the design's three in the filter and behind screen 10's “More”.
  'report.species.crowberry': 'Crowberry',
  // Frame 10's third chip, which reveals the vocabulary rather than opening an index the app
  // does not have. The visible word is the frame's own; the accessible name states what the
  // press does, because “More” alone names nothing a screen reader can act on.
  'report.species.more': 'More',
  'report.species.more.a11y': 'Show all species',
  'report.species.fewer': 'Fewer',
  'report.species.fewer.a11y': 'Show fewer species',
  'report.plentiful': 'How plentiful were the berries?',
  'report.rating.none': 'None',
  'report.rating.few': 'Few',
  'report.rating.fair': 'Fair',
  'report.rating.good': 'Good',
  'report.rating.lots': 'Lots',
  'report.amount.label': 'Harvested amount · optional',
  'report.amount.placeholder': '1.3 kg',
  'report.offline.title': 'Offline · ready to queue',
  'report.offline.body': 'Your visit and report stay on this phone and sync when you’re online.',
  'report.save': 'Save report offline',
  // Written here rather than in the frame: the design has no failure state, and a write that
  // did not happen has to be said out loud (the same reason screen 14 has one).
  'report.saveFailed': 'Your report could not be saved.',
  'report.skip': 'Skip report for now',

  // Screen 12 · Core picker · Alerts and forecast. The alert is the design's own sample (there is
  // no weather, season or report source), so the eyebrow names the demo and the closing note says
  // the alert is one; the three reasons are the frame's own sentences, each with its own line.
  'discover.alert.eyebrow': 'CORE PICKER · FORECAST REASONING · SEASON DEMO',
  'discover.alert.title': 'A heads-up from the forest',
  // The frame's own stamp (“TODAY · 28 AUG · 09:30”), with the day as a value the language writes.
  'discover.alert.stamp': 'TODAY · {date} · {time}',
  // The frame's headline: “Ripe bilberries 1.8 km north”. The distance is a value and the rest is
  // the sentence — the species is plural here where a chip names it singular, and Finnish names the
  // direction with its own case ending rather than as a word the app appends.
  'discover.alert.headline': 'Ripe bilberries {distance} north',
  'discover.alert.score': '{score} / {max} yield',
  'discover.alert.context': 'Zone {zone} · {place} · Latest report {minutes} min ago',
  'discover.alert.why': 'Why this alert?',
  'discover.alert.reason.warm.title': 'A warm week',
  'discover.alert.reason.warm.detail': 'Three warm days support ripening.',
  'discover.alert.reason.rain.title': 'Rain on Sunday',
  'discover.alert.reason.rain.detail': 'Recent moisture supports berry growth.',
  'discover.alert.reason.picked.title': 'Last picked 6 days ago',
  'discover.alert.reason.picked.detail': 'Fresh reports suggest a promising return.',
  // The frame's own note says a forecast is made by combining weather, season and trust-weighted
  // reports. Nothing combines anything today, so the line says what is true and keeps the
  // design's own promise: a harvest is never guaranteed.
  'discover.alert.note':
    'A sample alert. No weather, season or report source is connected yet, and a harvest is never guaranteed.',
  // The frame's alert-preferences card (nodes 5:23480–5:23504) is drawn as the design's own sample,
  // because nothing delivers an alert, reads a radius, keeps quiet hours or subscribes to a species
  // (ADR-043). Its three values are formatted from the sample in `domain/alert.ts` — the sentences
  // they are printed in live here, and the closing line is the disclosure that keeps the figures
  // from reading as this phone's own settings.
  'discover.alert.preferences.title': 'Your alert preferences',
  'discover.alert.preferences.push': 'Ripe-berry push alerts',
  'discover.alert.preferences.radius': 'Search radius',
  'discover.alert.preferences.quiet': 'Quiet hours',
  'discover.alert.preferences.quietValue': '{from}–{to}',
  'discover.alert.preferences.species': 'Species',
  'discover.alert.preferences.speciesValue': '{species} + {count}',
  'discover.alert.preferences.sample':
    'The design’s sample preferences: no alert is sent yet, and nothing here reads a radius, quiet hours or a species.',

  // Screen 11 · Core picker · Visits and analytics. The eyebrow carries the design's own words
  // plus the disclosure that the season on it is the design's sample month, the way frame 06's
  // eyebrow says “SEASON DEMO” about its map: the figures are not the picker's own data, and the
  // screen that shows them says so. The period chips are the frame's own two labels, and the
  // summary card's five figures are values the screen formats (see `discover.season.metric.*`).
  'discover.season.eyebrow': 'CORE PICKER · PERSONAL INSIGHTS · SEASON DEMO',
  'discover.season.title': 'Your season so far',
  'discover.season.period.month': 'August 2026',
  'discover.season.period.all': 'All visits',
  // The two chips are one real choice (ADR-043), so the group carries its own name. The three lines
  // under “Visit history” state what the choice is showing: the period and how many visits it holds,
  // and — only under the month chip, since nothing is outside “All visits” — how many it leaves out,
  // so a visit is never hidden without a trace.
  'discover.season.period.label': 'Visit period',
  'discover.season.history.shown.one': '{period} · 1 visit',
  'discover.season.history.shown.many': '{period} · {count} visits',
  'discover.season.history.outside.one': '1 visit outside this period',
  'discover.season.history.outside.many': '{count} visits outside this period',
  'discover.season.summary': 'A good month in the forest.',
  'discover.season.metric.harvested': 'Total harvested',
  'discover.season.metric.rate': 'kg / hour',
  'discover.season.metric.zones': 'Zones visited',
  'discover.season.metric.stay': 'Total stay time',
  'discover.season.metric.median': 'Median stay',
  'discover.season.chart.title': 'Harvest by visit',
  'discover.season.chart.unit': 'kg',
  'discover.season.history.title': 'Visit history',
  // The row's own title, with the zone's number and the species as values: the frame prints
  // “Zone 14 · Lingonberry”, and the species is the same word screen 10's chips use.
  'discover.season.row.title': 'Zone {zone} · {species}',
  'discover.season.row.queued': 'Queued',
  'discover.season.row.synced': 'Synced',
  'discover.season.note':
    'Includes your queued visit. Harvest rates use only visits with a recorded weight.',
  // Screen 13 · Account and offline · Downloads. The app's sync centre is the report queue, so the
  // frame's heading carries the count as a value (“Waiting to sync · 1 report”) and the two keys
  // below are its singular and its plural: the sentence belongs to the language, which is why the
  // count is not glued to a word here.
  // The frame's own journey label with the disclosure frame 06's map and frame 11's season screen
  // carry: since ADR-042 the screen draws the design's sample region, storage and actions, so it says
  // so on itself rather than only in a sentence further down.
  'offline.eyebrow': 'ACCOUNT / OFFLINE · SYNC CENTRE · SEASON DEMO',
  'offline.title': 'Ready beyond the signal',
  // The downloaded region the frame draws, and everything that hangs off it: the design's own
  // sample, drawn as readings and labelled as the sample it is. The units and the figures are the
  // frame's; the sentence above them is the app's, and it is the reason none of it can be mistaken
  // for what this phone holds.
  'offline.sample.note':
    'The region, the storage figures and the two actions below are the design’s own sample: this phone has downloaded nothing and nothing syncs yet.',
  'offline.region.title': 'Laajavuori region',
  // The frame's own line (node 5:23549), with its two figures and its own word for what has
  // happened to the region — which, per the sentence above, is the sample's word rather than the
  // app's claim.
  'offline.region.detail': '{area} km² · {size} MB · Downloaded',
  // The value both rows of the card end with (node 5:23562): the frame's word for a region that is
  // on the phone, drawn as a value because the row behind it opens nothing.
  'offline.cached': 'Cached',
  'offline.tiles.title': 'Map tiles & {count} zones',
  'offline.tiles.detail': 'Available offline',
  'offline.forecast.title': 'Today’s forecast',
  'offline.forecast.detail': '{date} · saved at {time}',
  'offline.refresh.note': 'Refresh forecasts online each day before you go.',
  'offline.storage.label': 'Storage used',
  'offline.storage.value': '{used} / {total} MB',
  // The frame's two actions, drawn with the frame's words and claiming no role: there is no
  // transport to retry over and no region store to manage.
  'offline.retry': 'Retry sync',
  'offline.manage': 'Manage downloaded regions',
  'offline.lastSync': 'Last successful sync · {date} at {time}',
  // The frame's own status message (node 5:23544), drawn when the device reports no reachable
  // connection — and only then.
  'offline.status.title': 'You’re offline',
  'offline.status.body': 'Keep picking. Visits and reports are saved on your phone.',
  'offline.waiting.one': 'Waiting to sync · {count} report',
  'offline.waiting.many': 'Waiting to sync · {count} reports',
  'offline.row.title': 'Zone {zone} · {species}',
  // The frame's own line (“28 Aug · 52 min · Yield 4 / 5 · 1.3 kg”), with the values the picker's
  // own report supplies: its rating is the design's 1–5 scale, and its harvest is what they typed.
  // A report with no harvest uses `metaNoAmount` rather than printing a zero nobody recorded.
  'offline.row.meta': '{date} · {minutes} min · Yield {yield} / {max} · {amount}',
  'offline.row.metaNoAmount': '{date} · {minutes} min · Yield {yield} / {max}',
  'offline.row.chip': 'Queued · visit + report',
  // The frame's own line here promises a retry (“Your report is safe and will retry
  // automatically”), and there is no transport to retry over yet (ADR-005). What is true is said
  // instead: the report is on this phone, and nothing has left it.
  'offline.note':
    'Saved on this phone. Nothing has been sent yet — syncing arrives with the server.',
  'offline.empty': 'Nothing is waiting to sync.',

  // The frame labels this row “Background visit tracking”; the switch withdraws the consent screen
  // 05 actually collects, which is tracking while the app is open (ADR-047).
  'privacy.visitTracking': 'Visit tracking while the app is open',
  // Frame 14's own row, and the one row whose destination now exists: frame 13's sync centre.
  // Its value is the queue's own count (“1 queued”), so the number is a value and the word is
  // the language's.
  'privacy.sync.title': 'Offline maps & sync',
  'privacy.sync.value': '{count} queued',
  'privacy.eyebrow': 'ACCOUNT / OFFLINE · YOUR SETTINGS',
  // The screen the consent sentence on screen 05 promises, and the two strings the frame
  // gives it. `saveFailed` is written here rather than in the frame: the design has no
  // failure state, and a write that did not happen has to be said out loud.
  'privacy.saveFailed': 'Your choice could not be saved.',
  // The frame's own heading is “Private by nature”; the owner asked for the screen to read as the
  // profile whose settings these are (2026-10-22). The frame's own words are recorded in
  // docs/design-source.md.
  'privacy.title': 'Profile',
  'privacy.trailsNote.body':
    'Visibility applies to spots, not your route. Exact tracks are never shown to others.',
  'privacy.trailsNote.title': 'GPS trails are never public',
  // Frame 14's account row, which the app fills from the session it is holding (ADR-029). The
  // frame's own line is “aino@example.fi · Email verified”; the claim is a word of its own so the
  // same line can name a phone number, which screen 03 offers the other way, and neither word is
  // ever printed over the other's identifier. `readFailed` is written here rather than in the
  // frame: the design has no unreadable store, and an account the app could not read is not an
  // account it may present as nobody's.
  'privacy.account.line': '{identifier} · {verified}',
  'privacy.account.readFailed': 'Your account could not be read.',
  'privacy.account.verifiedEmail': 'Email verified',
  'privacy.account.verifiedPhone': 'Phone verified',
  // Frame 14's “Use Picky as” card: the app's one real role, and the design's own note that
  // buying is not one of them (CONTEXT.md, **Buyer**).
  'privacy.useAs.title': 'Use Picky as',
  'privacy.useAs.picker': 'Picker',
  'privacy.useAs.buyer': 'Buyer',
  'privacy.useAs.note': 'Same account. Buying is a planned marketplace extra.',
  // Frame 14's “Saved spots” row and the surface it opens. The words are the frame's; the screen
  // behind the row was never drawn, so its own lines are written here (ADR-030). The eyebrow no
  // longer carries the “SEASON DEMO” disclosure: since ADR-060 the rows are source zones, and a
  // saved id the source cannot describe is printed alone rather than filled from the design.
  'privacy.savedSpots.eyebrow': 'ACCOUNT / OFFLINE · SAVED SPOTS',
  'privacy.savedSpots.title': 'Saved spots',
  // The frame's own subtitle under the row's label (node 5:23644, “4 spots · private by
  // default”), printed only once the plan has been read: it counts what it describes, so an
  // unread plan has no sentence either. The singular and the plural are the language's own two
  // keys, as frame 13's waiting label is.
  'privacy.savedSpots.subtitle.one': '{count} spot · private by default',
  'privacy.savedSpots.subtitle.many': '{count} spots · private by default',
  'privacy.savedSpots.empty': 'No saved spots yet.',
  'privacy.savedSpots.browse': 'Browse zones',
  'privacy.savedSpots.readFailed': 'Your saved spots could not be read.',
  // Frame 14's own row, drawn as the reading it is: the app follows the device's language and
  // has no picker to open (ADR-017), so each catalogue names its own language.
  'privacy.language.title': 'Language',
  'privacy.language.value': 'English',
  // The frame's last control, and the failure it has to be able to state: signing out deletes
  // what this device holds, so a run that did not finish is not one to pass over.
  'privacy.signOut': 'Sign out',
  // A deletion cannot be undone here, so it is named before it happens. The records are the three
  // `src/services/sign-out.ts` clears; the copy must not promise a narrower loss.
  'privacy.signOut.confirm.title': 'Sign out of this phone?',
  'privacy.signOut.confirm.body':
    'Signing out deletes the saved spots, the visit reports waiting to sync and your consent record from this phone. They cannot be recovered here.',
  'privacy.signOut.confirm.action': 'Sign out and delete',
  'privacy.signOut.confirm.cancel': 'Keep me signed in',
  // The order in `sign-out.ts` drops the session last, so a run that stopped part-way may already
  // have cleared some records: saying “nothing” would be a claim the app cannot make.
  'privacy.signOut.failed':
    'Signing out did not finish. Some records may still be here; try again.',

  // The two screens frame 14 draws rows for and no frame draws (nodes 5:23677 and 5:23688) —
  // “Account & security” and “Terms & privacy”. Both are app-drawn (ADR-039), so their words are
  // this repository's, and each screen's title doubles as the frame's row label: one word does not
  // get two keys.

  // Frame 14's account row drawn again, from the same session, plus what the app can be true about:
  // an email + password credential the app stores no password of (ADR-054), a session in memory for
  // an hour, and no account service behind any of it.
  'privacy.accountSecurity.eyebrow': 'ACCOUNT / OFFLINE · ACCOUNT & SECURITY',
  'privacy.accountSecurity.title': 'Account & security',
  'privacy.accountSecurity.intro': 'What the app knows about your account, and what keeps it.',
  'privacy.accountSecurity.none':
    'No session is being held. One lasts an hour from the moment you sign in.',
  'privacy.accountSecurity.reach.title': 'Your email and password are the key',
  'privacy.accountSecurity.reach.body':
    'Signing in asks for your email and password. The app keeps no password of its own, and no account service is connected to check one yet.',
  'privacy.accountSecurity.session.title': 'The session',
  'privacy.accountSecurity.session.where.label': 'Where it is kept',
  'privacy.accountSecurity.session.where.value': 'In this app’s memory, while the app is open.',
  'privacy.accountSecurity.session.where.hint':
    'Nothing is written to this phone yet: the store behind the stand-in is memory, and the secure store arrives with the account service.',
  'privacy.accountSecurity.session.lifetime.label': 'How long it lasts',
  'privacy.accountSecurity.session.lifetime.value': 'An hour from the moment you sign in.',
  'privacy.accountSecurity.session.lifetime.hint':
    'The hour is the provider’s own token lifetime rather than a preference of ours.',
  'privacy.accountSecurity.session.ends.label': 'What ends it',
  'privacy.accountSecurity.session.ends.value': 'Signing out, or the hour running out.',
  'privacy.accountSecurity.session.ends.hint':
    'A session that has run out is dropped the next time the app reads it.',
  // The one reading on this screen that changes while it is open (ADR-041): the session's own
  // expiry, floored at whole minutes so it never claims more time than there is. The hint says where
  // the number comes from and what the app does *not* do with it — nothing extends a session yet.
  'privacy.accountSecurity.session.remaining.label': 'Time left',
  'privacy.accountSecurity.session.remaining.value': '{minutes} min',
  'privacy.accountSecurity.session.remaining.underMinute': 'Less than a minute',
  'privacy.accountSecurity.session.remaining.hint':
    'Read from the session’s own expiry, once a second. Nothing here extends it — a session that ends is signed into again.',
  // What the user meets when the hour runs out with the screen open. Drawn where the account row
  // was, because the app is holding no account any more, and the sign-in screen's own title is the
  // way back in.
  'privacy.accountSecurity.ended.title': 'This session has ended',
  'privacy.accountSecurity.ended.body':
    'The hour that began when you signed in is up, so the app is holding no account.',
  'privacy.accountSecurity.absent.title': 'Not here yet',
  'privacy.accountSecurity.absent.service':
    'No account service is connected, so your name and your email address cannot be changed in the app and an account cannot be deleted.',
  'privacy.accountSecurity.absent.devices':
    'There is no list of your devices and no second session to end.',
  'privacy.accountSecurity.signOut.note':
    'Signing out deletes the visit tracking consent, the saved spots and the waiting reports on this phone, and then drops the session.',

  // The notice the app can honestly write today: what this phone holds, why each record exists and
  // how it goes away. Terms and a privacy notice are not invented here — there is no service to
  // accept terms for, and the lawful basis for each field is the owner's to state (PROJECT.md open
  // questions 15–16), which the last card says out loud.
  'privacy.termsPrivacy.eyebrow': 'ACCOUNT / OFFLINE · TERMS & PRIVACY',
  'privacy.termsPrivacy.title': 'Terms & privacy',
  'privacy.termsPrivacy.intro':
    'What this phone holds, why each record exists, and how it goes away.',
  'privacy.termsPrivacy.held.title': 'What this phone holds',
  'privacy.termsPrivacy.held.empty': 'Nothing of yours is on this phone yet.',
  'privacy.termsPrivacy.held.readFailed':
    'Some of what this phone holds could not be read, so the list below is incomplete.',
  'privacy.termsPrivacy.record.account.label': 'Your account',
  'privacy.termsPrivacy.record.account.value':
    'The name you signed up with, and the address or number you entered.',
  'privacy.termsPrivacy.record.account.hint':
    'Held in the app’s memory only: closing the app loses it, and signing out drops it too.',
  'privacy.termsPrivacy.record.consent.label': 'Visit tracking consent',
  'privacy.termsPrivacy.record.consent.value':
    'Whether visit tracking was agreed to, and when you decided.',
  'privacy.termsPrivacy.record.consent.hint':
    'Changed on Privacy settings; switching it off writes the refusal in place of the consent.',
  'privacy.termsPrivacy.record.plan.label': 'Saved spots',
  'privacy.termsPrivacy.record.plan.value': 'The zones you saved, as their identifiers.',
  'privacy.termsPrivacy.record.plan.hint':
    'Removed with the bookmark on a zone’s own screen; signing out deletes the whole list.',
  'privacy.termsPrivacy.record.queue.label': 'Visits waiting to sync',
  'privacy.termsPrivacy.record.queue.value':
    'The visit reports this phone holds, with what you typed about each one.',
  'privacy.termsPrivacy.record.queue.hint': 'Listed in the sync centre; signing out deletes them.',
  'privacy.termsPrivacy.rights.title': 'Your rights, and where they are',
  'privacy.termsPrivacy.rights.see.label': 'See it',
  'privacy.termsPrivacy.rights.see.value':
    'Each record above is listed where it lives: the plan on Saved spots, the reports in the sync centre, the consent and the account here.',
  'privacy.termsPrivacy.rights.copy.label': 'Take a copy',
  'privacy.termsPrivacy.rights.copy.value':
    'Taken on Your data: one file holding the records above, handed to this device’s own share sheet.',
  'privacy.termsPrivacy.rights.correct.label': 'Correct it',
  'privacy.termsPrivacy.rights.correct.value':
    'A saved spot is corrected by removing it; the account’s own details cannot be changed yet, because the service that owns them does not exist.',
  'privacy.termsPrivacy.rights.delete.label': 'Delete it',
  'privacy.termsPrivacy.rights.delete.value':
    'Signing out deletes every record above from this phone.',
  'privacy.termsPrivacy.leaves.title': 'Nothing leaves this phone',
  'privacy.termsPrivacy.leaves.body':
    'No account service, zone service or weather source is connected, so the app sends nothing anywhere. The reports it holds have never been uploaded.',
  'privacy.termsPrivacy.notice.title': 'The written notice',
  'privacy.termsPrivacy.notice.body':
    'The privacy notice and the terms are still being written, and this screen is where they will stand. What the app can state today is above: the records it holds, why each exists, and how to remove it.',

  // The export path open question 23 names as owed, and the screen it is used from — drawn from the
  // app's own vocabulary because the design never drew it. The notice says what the phone holds;
  // this screen hands a copy over. Its copy states the one thing that can leave the phone (the
  // user's own choice in the platform's share sheet) because nothing the app does sends anything.
  'privacy.export.eyebrow': 'ACCOUNT / OFFLINE · YOUR DATA',
  'privacy.export.title': 'Your data',
  'privacy.export.intro': 'A copy of what this phone holds, in a form another tool can read.',
  'privacy.export.contents.title': 'What the copy contains',
  'privacy.export.contents.empty':
    'This phone holds nothing of yours yet, so the copy would be empty.',
  // The consent is a decision rather than a count, so the copy states the decision itself — and
  // states the purpose the app serves: tracking while the app is open, which is the record's own
  // field and the copy's own words since 2026-10-12 (ADR-047). Found by the claims guard in
  // `src/config/__tests__/copy-claims.test.ts`, which is why that check exists.
  'privacy.export.contents.consent.on': 'Visit tracking on',
  'privacy.export.contents.consent.off': 'Visit tracking off',
  'privacy.export.format.title': 'The file',
  'privacy.export.format.body':
    'One JSON document: a format name, the moment the copy was made, and the records below in full. It holds nothing the app does not have — no password and no key, because the app has neither.',
  'privacy.export.share.label': 'Share a copy',
  'privacy.export.share.noteTitle': 'Where the copy goes',
  'privacy.export.share.note':
    'The device’s own share sheet opens and you choose where the copy goes. The app sends nothing itself.',
  // The three things the platform can answer, and each one is said as itself: a copy handed to the
  // sheet is not a copy that arrived anywhere (iOS reports the share action even when the user backs
  // out of the sheet), and a platform that refused is not a share at all.
  'privacy.export.share.shared': 'The copy was handed to the share sheet.',
  'privacy.export.share.dismissed': 'The share sheet was closed without choosing.',
  'privacy.export.share.failed': 'The copy could not be handed over.',

  // Frames 15–18 — the planned marketplace, as a demo. Every screen of it carries the frame's own
  // disclosure that this is not a live marketplace: the chip the frame paints on all four frames
  // (“Planned extra”), and the lines under it on frames 15 and 18 (“Buyer mode · Preview”,
  // “Provider test mode”). Nothing here charges, sends or receives anything.
  'market.disclosure': 'Planned extra',

  // Screen 15 · Browse (node 5:23780).
  'market.eyebrow.browse': 'PLANNED MARKETPLACE · OUTSIDE CORE',
  'market.browse.mode': 'Buyer mode · Preview',
  'market.title.browse': 'The local harvest',
  // The field's own example (node 5:23798), and the field's accessible name: a placeholder is not
  // a label, and it disappears the moment the picker types.
  'market.search.placeholder': 'Berries near Jyväskylä',
  // The frame's three filter chips (node 5:23801). They are drawn as the frame draws them and
  // claim no role: the app holds two listings and both survive each of the three, so a chip that
  // acted would be a filter nothing can observe.
  'market.filter.all': 'All berries',
  'market.filter.pickup': 'Pickup',
  'market.filter.distance': 'Within 10 km',
  // The frame's text action (node 5:23828) reads “Browse 12 local listings”. The app holds two,
  // and prints the number it can answer for — the number of listings the search left, so the line
  // is both the frame's sentence and the answer a filter has to give (the rule frame 06's own
  // filter line follows). It opens nothing: there is no listing index behind it, so it claims no
  // role.
  'market.browse.count.one': 'Browse {count} local listing',
  'market.browse.count.many': 'Browse {count} local listings',
  // The empty answer. The frame draws no such state, and a search that found nothing must never
  // look like a search that did not run.
  'market.browse.none': 'No listings match that search.',
  // One listing card (nodes 5:23811–5:23816): its price, what is left of it, its seller — and,
  // where the app has a detail screen for the listing, the chevron's own accessible name.
  'market.card.price': '€{amount} / kg',
  'market.card.available': '{available} kg available · {place}',
  'market.card.availableAway': '{available} kg available · {place}, {distance} away',
  'market.card.seller': '{name} · {rating} · {reviews} reviews',
  'market.card.open': 'Open {name}',

  // Screen 16 · Listing detail (node 5:23832).
  'market.eyebrow.listing': 'PLANNED MARKETPLACE · LISTING',
  'market.listing.headline': 'Forest to your table.',
  'market.listing.price': '€{amount}/kg',
  'market.listing.stock': '{species} · {available} kg available',
  'market.listing.blurb':
    'Hand-picked today, sorted and kept cool. Finnish wild blueberries, full of forest flavour.',
  'market.listing.harvested': 'Harvested {date}',
  // The frame prints “Today” before the window. The app does not: the demo's day is the design's
  // own 28 August 2026, and a screen may not claim that a date is the day the picker is holding
  // the phone (AGENTS.md §2.3). The rest of the frame's line is drawn as it is.
  'market.listing.pickup': 'Pickup · {place} {window}',
  'market.listing.delivery': 'Local delivery by agreement in chat',
  'market.seller.badge': 'Verified seller',
  'market.seller.meta': 'Verified seller · {rating} / 5 · {reviews} reviews',
  // A seller the app has not verified prints its figures without the badge's claim: the frame
  // draws the badge on every seller it shows, and the badge is what verification is for.
  'market.seller.metaUnverified': '{rating} / 5 · {reviews} reviews',
  'market.listing.contact': 'Contact',
  // The seller the action reaches, in the name a screen reader hears: the frame's own action is
  // 104 px of label inside a 165 px button (“Contact Matti”), and the app prints the whole name it
  // holds (docs/design-source.md). The name would wrap there, so the label is the design's word and
  // this is where the rest of it lives.
  'market.listing.contactA11y': 'Contact {name}',
  'market.listing.order': 'Order berries',
  'market.listing.escrow': 'Planned provider escrow protects payment until you confirm delivery.',

  // Screen 17 · Seller chat (node 5:23883).
  'market.eyebrow.chat': 'PLANNED MARKETPLACE · SELLER CHAT',
  'market.chat.listing': '{name} · {price}',
  'market.chat.listingMeta': '{available} kg available · {place}',
  'market.chat.stamp': '{date}',
  // The thread's own four messages (nodes 5:23911–5:23923), which are the design's sample
  // exchange. Their numbers are the demo order's (`DEMO_ORDER`), and the screen test asserts the
  // two agree rather than trusting the copy to have been updated with the order.
  'market.chat.ask': 'Hi Matti! Could I get 5 kg of blueberries this evening?',
  'market.chat.reply': 'Of course! That’s €40. Pickup is at Laajavuori car park, 17:00–19:00.',
  'market.chat.confirm': 'Perfect. I’ll be there at 18:30.',
  'market.chat.pack':
    'Great, I’ll pack 5 kg for you. Please order in Picky so payment is held safely.',
  'market.chat.read': 'Read',
  // Who wrote a bubble, for the accessible name the bubble carries: a bubble's side is a position,
  // and a position is not a signal a screen reader hears.
  'market.chat.author.picker': 'You',
  'market.chat.author.seller': 'Seller',
  'market.chat.messageA11y': '{author}: {text}',
  'market.chat.summary': 'View order summary · €{total}',
  // The composer the frame draws (node 5:23928). No message is delivered anywhere, so it is drawn
  // as the frame draws it and claims no input role — a field that silently swallowed what a
  // picker typed would be worse than a field that is plainly not one.
  'market.chat.composer': 'Write a message…',

  // Screen 18 · Checkout and order status (node 5:23935).
  'market.eyebrow.order': 'PLANNED MARKETPLACE · DEMO ORDER',
  'market.order.title': 'Your berries are reserved',
  'market.order.testMode': 'Provider test mode',
  'market.order.confirmed.title': 'Test order confirmed',
  'market.order.confirmed.body': 'No real money was charged. Demo payment is held by the provider.',
  'market.order.by': '{seller} · Harvested {date}',
  'market.order.line': '{kilograms} kg × {unit}',
  'market.order.delivery': 'Pickup · no delivery fee',
  'market.order.total': 'Total held',
  // A figure with its own symbol and nothing else, for the lines that print one (“€0”, the
  // subtotal and the total). Finnish writes the symbol after the number, which is why it is the
  // language's string and not a prefix in code.
  'market.price.symbol': '€{amount}',
  'market.order.pickup.title': 'Pickup with {name}',
  // The frame's own “Today” is absent here for the reason frame 16's pickup line drops it.
  'market.order.pickup.meta': '{date} · {time} {place}, {town}',
  'market.order.status.confirmed': 'Order confirmed · payment held',
  'market.order.status.waiting': 'Waiting for pickup confirmation',
  'market.order.hold.title': 'Confirm only after you receive your berries',
  'market.order.hold.body':
    'Payment stays held until delivery is confirmed. Confirmation releases it to {name}.',
  // `market.order.confirm` and `market.order.dispute` are deliberately absent: the frame draws
  // both, and neither is rendered, because confirming receipt releases a payment and a dispute
  // freezes one — and no provider holds anything (PROJECT.md, known issue 22). A string no screen
  // renders is not translated (the catalogue guard).
  'market.order.message': 'Message {name}',
  'market.order.disputeNote':
    'A problem with the order? A dispute keeps payment held while it is reviewed.',
} as const;

export type TranslationKey = keyof typeof en;
