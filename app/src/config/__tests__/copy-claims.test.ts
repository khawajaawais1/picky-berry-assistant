import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import * as ts from 'typescript';

import { en, type TranslationKey } from '@/services/i18n/locales/en';
import { fi } from '@/services/i18n/locales/fi';

/**
 * “Does the app still say it does something it does not do?”
 *
 * That question was answered by hand on 2026-10-12 — every string in both catalogues, read against
 * the code that renders it — and the answer is [docs/copy-claims-audit.md](../../../docs/copy-claims-audit.md),
 * whose table this file holds in code. The defect it exists for is the one the consent screen had
 * for a fortnight: the copy promised background capture while the app read a position in the
 * foreground only, and nothing failed. Copy drifts back as easily as it drifts: a reverted string,
 * a new screen reusing a frame's sentence, a translation that says more than its original.
 *
 * So the claim vocabulary is scanned in **both catalogues** and every match has to be on the
 * ledger below with the family it belongs to. A family whose ledger is empty is asserted to have
 * no matches at all, which is how “the app promises no background capture” stays true instead of
 * being true once.
 *
 * What it is **not**: a judge of tone, of translation quality (PROJECT.md open question 13), or of
 * a claim made by a *composition* of individually-true strings — those are the findings in
 * [demo-and-stand-ins.md](../../../docs/demo-and-stand-ins.md) and the harness that reads the built
 * screens. It is a word scan, and its ledger is a human reading.
 *
 * **It reads the review-only prototype surfaces too** (since 2026-10-13), and that half is new: the
 * readings' words are hard-coded English rather than catalogue keys, so the shipped half of this
 * scan could never see them — which is how the sign-in reading came to propose the very sentences
 * [ADR-048](../../../docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md) had just removed
 * from the app. Their words are read **from source, with the TypeScript compiler** (see
 * `wordsIn`), and they are held to the same vocabulary through a separate ledger: a claim the app
 * may not make is allowed in review paper only where a `PROPOSALS` entry says why, so the tension is
 * recorded instead of a check going quietly green.
 *
 * It lives in `src/config/__tests__` for the reason the other document guards do: it holds the
 * project's copy against the project's own records, and `npm run verify` runs it in the gate.
 */

type Family = {
  /** Short name, used in the failure message. */
  id: string;
  /** What the copy claims, in the audit's words. */
  subject: string;
  /** The vocabulary that claim is written with, in either language. */
  pattern: RegExp;
  /**
   * The keys allowed to carry it, each with why the claim is acceptable where it is. An entry with
   * no matching string fails too: a ledger that outlives its claims is a ledger nobody reads.
   */
  recorded: readonly { key: TranslationKey; why: string }[];
};

const FAMILIES: readonly Family[] = [
  {
    id: 'background-capture',
    subject: 'capture in the background',
    // `tausta` is the Finnish stem (taustaseuranta, taustasijainti, taustalla); anchoring on
    // “taustal” would have matched only the last of them, which this test's planted originals
    // caught before the scan shipped.
    pattern: /\bbackground\b|\btausta/i,
    // Empty on purpose, and asserted empty below: since 2026-10-12 no shipped string promises
    // background capture. The app reads a position in the foreground only (ADR-045) and the copy
    // says so (ADR-047 §1); the background half is the owner's pending decision (ADR-047 §2).
    // The export document's consent lines (`privacy.export.contents.consent.on`/`.off`) were the
    // last two, and this scan is what found them — the manual pass had missed them.
    recorded: [],
  },
  {
    id: 'automatic-detection',
    subject: 'an arrival or an exit the app detected on its own',
    pattern:
      /detected automatically|automatically detected|ends the visit automatically|havaittiin automaattisesti|päättää käynnin automaattisesti|Exit detected/i,
    recorded: [
      {
        key: 'discover.visit.arrived.title',
        why: 'The frame’s own title on screen 09, disclosed by its SEASON DEMO eyebrow (demo row A5); nothing detects an arrival (known issue 17).',
      },
      {
        key: 'discover.visit.supporting',
        why: 'The frame’s exit sentence on screen 09, under the same disclosure (demo row A5); the visit it closes is the design’s sample (known issue 26).',
      },
      {
        key: 'report.exit.title',
        why: 'The frame’s own heading for the exit summary screen 10 draws (demo row A6).',
      },
    ],
  },
  {
    id: 'a-message-the-app-sent',
    subject: 'a message the app sent',
    // The vocabulary of “a code is on its way”, in both languages. The first version of this
    // pattern held only the words the strings it was written for happened to use, so five more
    // went past it — “We send six digits”, “Send me a code”, “the code went to”, and the Finnish
    // “koodi lähetettiin” (ADR-048). A claim is only covered if the vocabulary catches it.
    pattern:
      /we (send|sent)|sent by (SMS|text)|sent to your (email|phone)|code went to|your inbox|postilaatikko|send me a code|code is sent|lähettämämme|lähetämme|lähetä minulle|tekstiviestillä lähetetty|koodi lähetettiin/i,
    // Empty from 2026-10-12 to 2026-10-24: no shipped string claimed a delivery the app did not
    // make. Screen 04 (its heading, its supporting line and its phone note), the sign-in screen
    // (its supporting line and its action), the account surface's reach line and the Terms notice's
    // account record all named one before, and each now says what the step does and which
    // destination the code belongs to (ADR-048).
    //
    // One entry since 2026-10-24, and it is the branch ADR-048 recorded: the reset confirmation's
    // live heading is drawn only where `EXPO_PUBLIC_FIREBASE_API_KEY` configures the provider that
    // sends the email, so the sentence is true in exactly the build that shows it (ADR-062). Without
    // a key the screen keeps `requested.heading`, which claims acceptance rather than delivery.
    recorded: [
      {
        key: 'onboarding.forgotPassword.requested.live.heading',
        why: 'Drawn only with a configured reset provider (`passwordResetAvailability` is `live`, ADR-062), where the address really is in the provider’s hands; the keyless build draws `requested.heading` and the test-build note instead.',
      },
    ],
  },
  {
    id: 'a-verification-that-happened',
    subject: 'a verification that happened',
    // The account row's own two labels, in both languages — not the word “confirmed”, which the
    // marketplace demo's own status uses about an order rather than about an account.
    pattern: /^(Email|Phone) verified$|^(Sähköposti|Puhelin) vahvistettu$/i,
    recorded: [
      {
        key: 'privacy.account.verifiedEmail',
        why: 'Frame 14’s own row label, drawn from the session’s identifier; nothing verifies an address now that screen 04 is retired (known issue 27).',
      },
      {
        key: 'privacy.account.verifiedPhone',
        why: 'The same row for a phone number (known issue 27).',
      },
    ],
  },
  {
    id: 'a-visit-that-reached-a-server',
    subject: 'a visit that reached a server',
    pattern: /^Synced$|^Synkronoitu$|^Queued$|^Jonossa$/i,
    recorded: [
      {
        key: 'discover.season.row.queued',
        why: 'True of every row the phone holds: nothing syncs, so the queue is the row’s own truth about itself (demo rows A9, F1).',
      },
      {
        key: 'discover.season.row.synced',
        why: 'The design’s two sample visits print it in the same list as the picker’s own rows, with no marker of their own — recorded and still open (demo rows A9, F1; known issue 19).',
      },
    ],
  },
  {
    id: 'cached-tiles-and-a-sync',
    subject: 'cached tiles, a saved forecast and a sync that happened',
    pattern:
      /^Cached$|^Välimuistissa$|Retry sync|Yritä synkronoida uudelleen|last successful sync|Viimeisin synkronointi/i,
    recorded: [
      {
        key: 'offline.cached',
        why: 'The design’s sample region, disclosed on the screen by its eyebrow and its own sentence; both actions are readings with no role (demo row A16).',
      },
      {
        key: 'offline.retry',
        why: 'A reading, not a control: there is no transport to retry over (demo row A16, ADR-042).',
      },
      {
        key: 'offline.lastSync',
        why: 'The design’s own sample instant (demo row A16).',
      },
    ],
  },
  {
    id: 'a-forecast-service',
    subject: 'a forecast or weather source',
    pattern: /forecast|ennuste/i,
    recorded: [
      {
        key: 'discover.details.forecastDisclaimer',
        why: 'The frame’s own disclaimer, which hedges the claim instead of making it (demo row A3).',
      },
      {
        key: 'discover.details.weather',
        why: 'The reading beside that disclaimer, on the same disclosed card (demo row A3).',
      },
      {
        key: 'discover.alert.eyebrow',
        why: 'The alert screen’s own disclosure, which names the reasoning as the design’s sample (demo row A10).',
      },
      {
        key: 'offline.forecast.title',
        why: 'The saved forecast in the design’s sample region (demo row A16).',
      },
      {
        key: 'offline.refresh.note',
        why: 'The frame’s instruction to refresh online, which names the missing source rather than hiding it (demo row A16).',
      },
    ],
  },
  {
    id: 'a-push-alert',
    subject: 'a push alert',
    pattern: /push alert|push-hälytyk/i,
    recorded: [
      {
        key: 'discover.alert.preferences.push',
        why: 'The design’s own sample switch, with the card saying nothing reads it and the switch carrying no role (demo row A17, ADR-043).',
      },
    ],
  },
  {
    id: 'a-trust-judgement',
    subject: 'a trust judgement about a report or a seller',
    pattern: /^(Trusted|Unverified|Luotettu|Vahvistamaton)$/i,
    recorded: [
      {
        key: 'discover.details.reports.trust.trusted',
        why: 'The design’s vocabulary for reports no service has judged, on the zone details card disclosed as its sample (demo rows A3, F4).',
      },
      {
        key: 'discover.details.reports.trust.unverified',
        why: 'The same vocabulary, in the negative (demo row A3).',
      },
    ],
  },
  {
    id: 'money-held',
    subject: 'money held for a purchase',
    pattern:
      /escrow|payment held|payment stays held|payment is held|maksu pidossa|maksu pysyy turvassa|maksun suojattuna/i,
    recorded: [
      {
        key: 'market.listing.escrow',
        why: 'Hedged on screen (“Planned provider escrow”), on a screen carrying the Planned extra disclosure (demo row A12, finding F4, known issue 22).',
      },
      {
        key: 'market.order.status.confirmed',
        why: 'The marketplace demo’s own status, disclosed by Provider test mode and the test-order note (demo row A12).',
      },
      {
        key: 'market.order.hold.body',
        why: 'The demo order’s hold, on the same disclosed screen (demo row A12).',
      },
      {
        key: 'market.order.confirmed.body',
        why: 'The test-order note itself: it says no real money was charged (demo row A12).',
      },
      {
        key: 'market.order.disputeNote',
        why: 'The demo order’s dispute note, on the same disclosed screen (demo row A12).',
      },
      {
        key: 'market.chat.pack',
        why: 'One line of the demo thread, on a composer drawn without a role and a thread nothing can send (demo row A12, ADR-044).',
      },
    ],
  },
  {
    id: 'others-see-your-position',
    subject: 'other people seeing your position or your trail',
    pattern:
      /never shown to other people|never public|never shown to others|Others see|ei koskaan julkisia|ei koskaan näytetä muille/i,
    recorded: [
      {
        key: 'onboarding.location.reassurance',
        why: 'One of the four sentences the owner confirmed stay exactly as they are: they describe the product’s model (spots, never positions), not a live map (PROJECT.md “Recorded requirement”, known issue 31).',
      },
      {
        key: 'onboarding.createAccount.privacy.body',
        why: 'The same owner-affirmed sentence on screen 03 (PROJECT.md “Recorded requirement”).',
      },
      {
        key: 'discover.visit.privacy',
        why: 'The same promise on screen 09, where the trail it names does not leave the device either (PROJECT.md “Recorded requirement”).',
      },
      {
        key: 'privacy.trailsNote.title',
        why: 'Frame 14’s own status message, the same owner-affirmed claim (PROJECT.md “Recorded requirement”).',
      },
      {
        key: 'privacy.trailsNote.body',
        why: 'Its second sentence, which scopes the promise to spots rather than routes (PROJECT.md “Recorded requirement”).',
      },
    ],
  },
  {
    id: 'identifier-is-an-address',
    subject: 'an address as the account’s own identifier, where the flow offers a number too',
    // The vocabulary of naming **the account's identifier as an address**. It was written for
    // screen 04's two states (ADR-049 §3, ADR-049 §7), whose title and way back named an address
    // or a number. **The flow offers an address only since 2026-10-24** — phone sign-in is
    // deferred (ADR-054 §5) and screen 04 is retired (ADR-059) — so no shipped string can make the
    // claim this family reads. The family stays with an empty ledger, asserted empty below, so a
    // re-cut that reintroduces a code or a phone state has to meet it again.
    pattern:
      /(verify|confirm|check) your (email|address)|change (your )?(email|address)|signed up by (an )?email|by email instead|vahvista sähköposti|vaihda sähköposti|sähköpostiosoitteesi/i,
    recorded: [],
  },
  {
    id: 'a-settings-step-the-app-never-takes',
    subject: 'a settings step the app never takes',
    // The vocabulary of **sending the reader out of the app to a location or device settings
    // surface** — not the word “settings”, which the app owns and uses about its own surfaces
    // (“Privacy settings”, “tietosuoja-asetuksissa”). The claim is the step, not the word: screen
    // 05's action read “Continue to location settings” / “Jatka sijaintiasetuksiin” while the press
    // opened the map, exactly as the screen's own skip action does (known issue 33).
    pattern:
      /location settings|sijaintiasetuksiin|sijaintiasetukset|device settings|system settings|laitteen asetukset/i,
    // Empty on purpose, and asserted empty below: no shipped string sends the reader to a settings
    // surface, because there is none to send them to — the consent is recorded on the device
    // (ADR-020/047) and the platform's permission is asked **in** the app the first time a screen
    // reads a position (ADR-045). Screen 05's action says where the press leads instead (ADR-050,
    // which closes known issue 33 and keeps the frame's own words for the journey that really does
    // open a settings surface).
    recorded: [],
  },
];

/**
 * The claims the review-only prototype readings propose.
 *
 * **Why this half exists, and why it was added late.** The prototypes are the paper a designer
 * judges by flipping between readings, and their copy is literal English by design — a prototype's
 * wording is not a translation anyone should review — so the catalogue scan above is blind to them
 * by construction. What that blindness cost, measured the day this ran: the sign-in reading's own
 * sentence (“We send six digits to your email or phone. No password to remember — and none to
 * leak.”) and its action's label (“Send me a code”) are **the strings the app itself shipped until
 * 2026-10-12**, the ones ADR-048 rewrote because nothing in the app sends a code. A reading a
 * designer may adopt was therefore proposing the two sentences the project had already decided it
 * cannot say, and no check could see it.
 *
 * **What it reads.** Every prototype source — any `.tsx` inside a `prototype` folder under `src`,
 * found by walking the tree rather than by listing files, so a third prototype is scanned the day it
 * exists — and, in each, the words a reviewer
 * reads: its JSX text and the literal values of the props that carry copy (`label`, `title`,
 * `eyebrow`, `placeholder`, `accessibilityLabel`). Comments, `report(…)` notes and interpolated
 * strings are not copy, and the compiler is what tells them apart (`wordsIn`). Measured: a plain
 * text search over the three prototype files matches **fifteen** lines for this vocabulary, and
 * twelve of them are the word *background* inside a style property (`backgroundColor`,
 * `colors.background`) — noise a line-based scan would have to filter by hand, and the reason this
 * reads the tree instead.
 *
 * **What it does with a match.** It has to be on `PROPOSALS` with the reading it belongs to and why
 * it may sit there. Recording is the answer the third time this project met the question (family 8
 * of the control audit, ADR-048 §6): the prototypes' words are the design's, an open questionnaire
 * owns the sign-in copy, and nothing here invents wording. What the record buys is that the tension
 * is visible — and that **the same scan's shipped half refuses these words**: they are not in a
 * catalogue, so they cannot ship, and adopting this reading means rewriting them first (ADR-048 §5).
 *
 * The vocabulary's teeth for this half are already proven: the planted originals of
 * `a-message-the-app-sent` are these two sentences, verbatim, held there since ADR-048 because they
 * are what the app shipped.
 */
type Proposal = {
  /** The family whose claim this is, from the list above. */
  family: string;
  /** The words, exactly as the reading shows them. */
  word: string;
  /** The reading, in the reviewer's terms. */
  where: string;
  /** Why the claim may be made there. */
  why: string;
};

const PROPOSALS: readonly Proposal[] = [
  {
    family: 'a-message-the-app-sent',
    word: 'We send six digits to your email or phone. No password to remember — and none to leak.',
    where: 'the sign-in prototype, reading A “Code first” (its supporting line)',
    why: `The design’s own candidate sentence for the screen, and **the sentence the app shipped
until 2026-10-12**: ADR-048 rewrote that line — \`onboarding.signIn.supporting\` now reads “One
identifier, then six digits. No password to remember — and none to leak.” — because nothing in the
app sends a code (the flow runs on the stand-in code ADR-027 installed, and the app’s own device
notice says it sends nothing anywhere). Kept rather than reworded, because a prototype’s words are
the design’s and the question reading A answers is the flow’s **shape**, not its wording
([to-questionnaire-sign-in.md](../../../to-questionnaire-sign-in.md) §1; §3 owns the words, and
nothing here may invent them). What the record buys is that the tension is visible: these words are
not in a catalogue, so they cannot ship, and adopting this reading means rewriting them first
(ADR-048 §5).`,
  },
  {
    family: 'a-message-the-app-sent',
    word: 'Send me a code',
    where: 'the sign-in prototype, reading A “Code first” (its action)',
    why: `The action’s label, which the app also shipped until 2026-10-12 — ADR-048 §2 records these
as the words the action **returns to** the day a transport exists (“the screen’s own words,
restored”). The reading presses honestly: the switcher’s note line reports where the press would
lead (“→ screen 04, the code screen that exists”). The label itself asks for a send the app cannot
make while no service exists, which is the claim the family reads.`,
  },
];

/** The props that carry copy in a prototype: what a reviewer reads, or is told. */
const COPY_PROPS = new Set(['label', 'title', 'eyebrow', 'placeholder', 'accessibilityLabel']);

/** Every prototype source, found rather than listed, as a path relative to the repository root. */
function prototypeSources(): string[] {
  const src = join(__dirname, '..', '..');
  const walk = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return walk(path);
      }

      // The shared chrome lives beside the readings (`src/components/prototype/`), so the folder is
      // what identifies a prototype source rather than the folder's parent.
      return entry.isFile() && entry.name.endsWith('.tsx') && path.includes(`${sep}prototype${sep}`)
        ? [path.slice(src.length + 1)]
        : [];
    });

  return walk(src).sort();
}

/**
 * The words one prototype source shows a reviewer.
 *
 * Read with the **TypeScript compiler** rather than with a regex over the file, because the
 * difference is exactly what a claim scan must not get wrong: a comment that says “we send a code”,
 * a `report('…')` note naming what a press would do, or a string built from an interpolation is not
 * copy, and only a parser can tell them from a text node. What comes back is JSX text (whitespace
 * collapsed, so a sentence wrapped across two lines is one word) and the literal values of
 * `COPY_PROPS` — the two ways this app draws copy.
 */
function wordsIn(file: string, source: string): string[] {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const words: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();

      if (text !== '') {
        words.push(text);
      }
    }

    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      COPY_PROPS.has(node.name.text) &&
      node.initializer !== undefined &&
      ts.isStringLiteral(node.initializer)
    ) {
      words.push(node.initializer.text);
    }

    node.forEachChild(visit);
  };

  visit(parsed);

  return words;
}

/** Every word of every prototype source, with the file it lives in. */
function prototypeCopy(): { file: string; word: string }[] {
  return prototypeSources().flatMap((file) =>
    wordsIn(file, readFileSync(join(__dirname, '..', '..', file), 'utf8')).map((word) => ({
      file,
      word,
    })),
  );
}

/** The value of a key in either catalogue, as the scan sees it. */
function valuesOf(key: TranslationKey): { language: 'en' | 'fi'; value: string }[] {
  return [
    { language: 'en', value: en[key] },
    { language: 'fi', value: fi[key] },
  ];
}

function keysMatching(pattern: RegExp): TranslationKey[] {
  return (Object.keys(en) as TranslationKey[]).filter((key) =>
    valuesOf(key).some(({ value }) => pattern.test(value)),
  );
}

describe('the claims the copy makes', () => {
  it('records every shipped string that makes one, in the family it belongs to', () => {
    const unrecorded: string[] = [];

    for (const family of FAMILIES) {
      const recorded = new Set(family.recorded.map((entry) => entry.key));

      for (const key of keysMatching(family.pattern)) {
        if (!recorded.has(key)) {
          unrecorded.push(`${family.id}: ${key} claims ${family.subject}`);
        }
      }
    }

    expect(unrecorded).toEqual([]);
  });

  it('keeps no ledger entry whose claim is gone, so the record cannot outlive the copy', () => {
    const stale: string[] = [];

    for (const family of FAMILIES) {
      const matching = new Set(keysMatching(family.pattern));

      for (const { key } of family.recorded) {
        if (!matching.has(key)) {
          stale.push(`${family.id}: ${key} no longer claims ${family.subject}`);
        }
      }
    }

    expect(stale).toEqual([]);
  });

  it('holds the families that are fixed to no matches at all', () => {
    // A family with an empty ledger is a claim the copy has stopped making, which is the point:
    // a reverted string, a new screen or a fresh translation fails here rather than shipping.
    const cleared = FAMILIES.filter((family) => family.recorded.length === 0);

    expect(cleared.map((family) => family.id)).toEqual([
      'background-capture',
      'identifier-is-an-address',
      'a-settings-step-the-app-never-takes',
    ]);

    for (const family of cleared) {
      expect(keysMatching(family.pattern)).toEqual([]);
    }
  });

  it('would catch the claims this check exists for, in either language', () => {
    // The words below are also the vocabulary's proof for the prototype half of this file: two of
    // this family's originals are what the sign-in reading proposes today (see `PROPOSALS`).
    // The claims, as their sentences read: two families' originals are the **defects** as they
    // shipped — the consent screen promised background capture for a fortnight while the app read a
    // position in the foreground only (ADR-047), and seven strings named a code the app had sent
    // while nothing in the app sends one (ADR-048) — a third's is the label that shipped until
    // 2026-10-13 (screen 05's action, ADR-050), and the fourth's are screen 04's own words, which
    // retired on 2026-10-24 (ADR-059). Every original is planted here — not
    // added to a catalogue, since the point is that the vocabulary catches it — so a reverted string
    // of a cleared family, a rewording of a shipped one, or a fresh translation, in either language,
    // fails the scan above instead of shipping.
    const planted: readonly { id: string; originals: readonly string[] }[] = [
      {
        id: 'background-capture',
        originals: [
          'I consent to background visit tracking. I can turn it off in Privacy settings.',
          'With your consent, background location times visits even with the screen locked.',
          'Suostun käyntien taustaseurantaan. Voit poistaa sen käytöstä tietosuoja-asetuksissa.',
          'Suostumuksellasi taustasijainti ajoittaa käyntejä näytön ollessa lukittuna.',
        ],
      },
      {
        id: 'a-message-the-app-sent',
        originals: [
          'Check your inbox.',
          'Enter the 6-digit code we sent to {destination} to confirm it’s you.',
          'The same verification step uses a code sent by SMS.',
          'We send six digits to your email or phone. No password to remember — and none to leak.',
          'Send me a code',
          'Signing in asks for a six-digit code sent to your email or phone.',
          'The name you signed up with, and the address or number the code went to.',
          'Katso postilaatikkosi.',
          'Syötä osoitteeseen {destination} lähettämämme 6-numeroinen koodi.',
          'Sama vahvistusvaihe käyttää tekstiviestillä lähetettyä koodia.',
          'Lähetämme kuusi numeroa sähköpostiisi tai puhelimeesi.',
          'Lähetä minulle koodi',
          'Nimi, jolla loit tilin, sekä osoite tai numero, johon koodi lähetettiin.',
        ],
      },
      {
        id: 'a-settings-step-the-app-never-takes',
        // The defect as it shipped, in both languages, then the shapes a fresh translation or a
        // neighbouring screen would wear: the app's own privacy surface is named “Privacy settings”
        // and must keep passing, so the vocabulary is about the *step out of the app*.
        originals: [
          'Continue to location settings',
          'Jatka sijaintiasetuksiin',
          'Continue to system settings to allow location.',
          'Salli sijainti laitteen asetukset -valikossa.',
          'Open device settings to grant access.',
        ],
      },
      {
        id: 'identifier-is-an-address',
        // The shipped strings, then a rewording of each shape: the vocabulary has to be wider than
        // the sentences it was written for, which is the lesson ADR-048 §5 records about this scan.
        originals: [
          'Verify your email',
          'Vahvista sähköpostisi',
          'Change email address',
          'Vaihda sähköpostiosoite',
          'Confirm your email address',
          'Vaihda sähköpostiosoitteesi',
        ],
      },
    ];

    for (const { id, originals } of planted) {
      const family = FAMILIES.find((entry) => entry.id === id)!;
      const missed = originals.filter((original) => !family.pattern.test(original));

      expect(missed).toEqual([]);
    }
  });
});

describe('the claims the prototype readings propose', () => {
  it('reads every prototype source the app has, and finds words in each', () => {
    // The reach, asserted: the folder walk found the prototypes at all, every source showed words,
    // and the copy scan is not reading an empty list. A prototype with no readable words is a
    // failure rather than a surface nothing checks.
    const sources = prototypeSources();
    const copy = prototypeCopy();

    expect(sources.length).toBeGreaterThan(0);
    expect(new Set(copy.map((entry) => entry.file)).size).toBe(sources.length);
  });

  it('reads the words a reading shows, and not the comments around them', () => {
    // The extractor, tested on a source rather than trusted: the props and the text nodes are the
    // copy, and the file's own prose about what it could say is not. This is the half a regex gets
    // wrong — the first version of this scan's predecessor matched the word `background` inside
    // `backgroundColor`.
    const fixture = [
      "import { AppText } from '@/components/atoms';",
      '',
      '// A comment claiming we send a code, which no reviewer ever reads.',
      "const note = 'We send a code';",
      '',
      'export function Reading() {',
      '  return (',
      '    <Screen eyebrow="PROTOTYPE · A" title="Welcome back">',
      '      {/* Another comment: we send six digits, hidden from the screen. */}',
      '      <AppText>Sign in with a code.</AppText>',
      '    </Screen>',
      '  );',
      '}',
    ].join('\n');

    expect(wordsIn('fixture.tsx', fixture)).toEqual([
      'PROTOTYPE · A',
      'Welcome back',
      'Sign in with a code.',
    ]);
  });

  it('records every claim a reading proposes, in the family it belongs to', () => {
    const unrecorded: string[] = [];

    for (const family of FAMILIES) {
      for (const { file, word } of prototypeCopy()) {
        const recorded = PROPOSALS.some(
          (proposal) => proposal.family === family.id && proposal.word === word,
        );

        if (family.pattern.test(word) && !recorded) {
          unrecorded.push(`${family.id}: “${word}” in ${file} claims ${family.subject}`);
        }
      }
    }

    expect(unrecorded).toEqual([]);
  });

  it('keeps no proposal whose words have moved on, so the record cannot outlive the reading', () => {
    const copy = prototypeCopy();
    const stale: string[] = [];

    for (const proposal of PROPOSALS) {
      const family = FAMILIES.find((entry) => entry.id === proposal.family);

      if (family === undefined) {
        stale.push(
          `“${proposal.word}” is recorded against “${proposal.family}”, which is no family`,
        );
        continue;
      }

      const still = copy.some(
        (entry) => entry.word === proposal.word && family.pattern.test(entry.word),
      );

      if (!still) {
        stale.push(
          `${proposal.family}: “${proposal.word}” (${proposal.where}) is no longer proposed by a reading`,
        );
      }
    }

    expect(stale).toEqual([]);
  });
});
