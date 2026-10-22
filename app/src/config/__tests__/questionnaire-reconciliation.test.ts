/// <reference types="node" />
// Node's file APIs, for reading the questionnaire documents below. `tsconfig.json` restricts the
// automatic type set to `jest`, so this file asks for the other one it needs by name.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The five questionnaires were reconciled against one another — the cover note's “Nothing is asked
 * twice” records it, and the response sheet carries the result as numbered slots — so that each
 * question two documents could plausibly ask is asked once, in the document that owns it: what a
 * shared spot is, who may be invited and what a viewer is told about the sharer stay with the
 * community-map document; whether anything curated exists below a zone, whether the boundaries may
 * be published and where the maps' storage lives stay with the zone-service document; the account
 * questions stay with the sign-in document; the invite's mechanics stay with the backend document;
 * and which screen a phone identifier walks stays with the verification document, which was added
 * on 2026-10-12 and defers to the sign-in document for what identifies a returning user.
 *
 * The defect this exists for is a question drifting back into a second document. Nothing else
 * fails when it does: the response sheet's counts still total 58, the documents still read well,
 * and the same question is answered twice. Prose cannot enforce a split, so this test reads the
 * four documents and states the split as an assertion.
 *
 * It matches by the words the reconciliation itself uses, which is both its method and its
 * limitation: a duplication phrased with none of a subject's words is invisible to it, and that
 * residue stays a review question.
 *
 * The same seam runs the other way, between PROJECT.md and the five documents: an open question a
 * questionnaire asks has to name that document, or the question reads as open in two places with
 * no way between them. The pointers added on 2026-10-11 (questions 5, 12, 17 and 25) and 2026-10-12
 * (question 20) are held by the second describe.
 *
 * It lives in `src/config/__tests__` for the reason `verify-gate.test.ts` does — it guards the
 * project's documents rather than a module's behaviour, and `npm run verify` runs it in the gate.
 */

/** The repository root: this file is `src/config/__tests__/`. */
const ROOT = join(__dirname, '..', '..', '..');

/** The four questionnaires at the repository root, by the letter the response sheet gives each. */
const QUESTIONNAIRES = {
  A: 'to-questionnaire-sign-in.md',
  B: 'to-questionnaire-community-map.md',
  C: 'to-questionnaire-zone-service.md',
  D: 'to-questionnaire-backend.md',
  E: 'to-questionnaire-verification.md',
} as const;

type Letter = keyof typeof QUESTIONNAIRES;

type Question = {
  /** The response sheet's number for it: the sheet's letter, plus the document's own. */
  id: string;
  text: string;
};

/**
 * Every numbered question a document asks. Documents A–C head theirs `### 1.1 …`; the backend
 * document writes them bold (`**1.1 …**`), because its sections are the headings. Those are the
 * numbered shapes the response sheet mirrors, and nothing else in the four documents matches.
 */
function questionsIn(letter: Letter): Question[] {
  const source = readFileSync(join(ROOT, QUESTIONNAIRES[letter]), 'utf8');

  return source.split('\n').flatMap((line) => {
    const match = /^### (\d+\.\d+) (.+)$/.exec(line) ?? /^\*\*(\d+\.\d+) (.+?)\*\*$/.exec(line);

    return match ? [{ id: `${letter}${match[1]}`, text: match[2] }] : [];
  });
}

type Split = {
  /** The subject, in the words the reconciliation uses. */
  subject: string;
  /** The document that owns it, by the response sheet's letter. */
  owner: Letter;
  /** The owning question, by the response sheet's number. */
  ownerQuestion: string;
  /** How the owning question reads — the sentinel that fails if it moves or is reworded away. */
  ownerAsks: RegExp;
  /** What asking the subject again in another document would look like. */
  duplicationLooksLike: RegExp;
};

const SPLITS: readonly Split[] = [
  {
    subject: 'what a shared spot is',
    owner: 'B',
    ownerQuestion: 'B1.2',
    ownerAsks: /the zone itself, or a place inside it/i,
    duplicationLooksLike: /shared spot|what is a .spot/i,
  },
  {
    subject: 'whether anything curated exists below a zone',
    owner: 'C',
    ownerQuestion: 'C2.4',
    ownerAsks: /below a zone exist/i,
    duplicationLooksLike: /below a zone|curated unit|unit below/i,
  },
  {
    subject: 'the account questions (where a submitted account goes)',
    owner: 'A',
    ownerQuestion: 'A4.1',
    ownerAsks: /talk to Firebase Authentication directly/i,
    duplicationLooksLike: /account service|talk to Firebase|submitted account|sign.?in happened/i,
  },
  {
    subject: "the invite's mechanics",
    owner: 'D',
    ownerQuestion: 'D4.1',
    ownerAsks: /one link per share/i,
    duplicationLooksLike: /one link per share|per-person invites|invite link|invite.s mechanics/i,
  },
  {
    subject: 'who may be invited',
    owner: 'B',
    ownerQuestion: 'B2.3',
    ownerAsks: /who can be invited/i,
    duplicationLooksLike: /who (can|may) be invited|only people the user already knows/i,
  },
  {
    subject: 'what a viewer is told about the sharer',
    owner: 'B',
    ownerQuestion: 'B2.4',
    ownerAsks: /know about the sharer/i,
    duplicationLooksLike: /about the sharer|viewer (knows|see)|their name, their initials/i,
  },
  {
    subject: 'whether the boundaries may be published',
    owner: 'C',
    ownerQuestion: 'C2.6',
    ownerAsks: /publish the boundaries/i,
    duplicationLooksLike: /publish/i,
  },
  {
    subject: "the maps' storage region",
    owner: 'C',
    ownerQuestion: 'C2.9',
    ownerAsks: /hosting and region/i,
    duplicationLooksLike: /polygon|basemap|tile host/i,
  },
  {
    subject: 'which screen a phone identifier walks',
    owner: 'E',
    ownerQuestion: 'E1.1',
    ownerAsks: /which screen does a phone sign-up see/i,
    duplicationLooksLike:
      /which screen a phone|phone sign.?up sees|a screen a phone (sign|number)/i,
  },
];

/** Every ask of an owned subject outside the document that owns it — the defect, as a list. */
function duplications(splits: readonly Split[], questions: Record<Letter, Question[]>): string[] {
  const found: string[] = [];

  for (const split of splits) {
    for (const letter of Object.keys(questions) as Letter[]) {
      if (letter === split.owner) continue;

      for (const question of questions[letter]) {
        if (split.duplicationLooksLike.test(question.text)) {
          found.push(
            `${question.id} asks ${split.subject} — which ${split.owner} owns (${split.ownerQuestion})`,
          );
        }
      }
    }
  }

  return found;
}

describe('the questionnaires’ reconciliation', () => {
  const questions: Record<Letter, Question[]> = {
    A: questionsIn('A'),
    B: questionsIn('B'),
    C: questionsIn('C'),
    D: questionsIn('D'),
    E: questionsIn('E'),
  };

  it('asks each reconciled subject once, in the document that owns it', () => {
    for (const split of SPLITS) {
      const matches = questions[split.owner].filter((question) =>
        split.ownerAsks.test(question.text),
      );

      expect(matches.map((question) => question.id)).toEqual([split.ownerQuestion]);
    }
  });

  it('asks no reconciled subject in a document that does not own it', () => {
    expect(duplications(SPLITS, questions)).toEqual([]);
  });

  it('reads every question the response sheet mirrors, so the scan cannot pass vacuously', () => {
    // The sheet's declared counts, one catch-all slot per document included: A 17 · B 12 · C 16 ·
    // D 13 · E 12. These are the numbered questions behind them, and the guard above can only be
    // trusted while all of them are found.
    expect(questions.A).toHaveLength(16);
    expect(questions.B).toHaveLength(11);
    expect(questions.C).toHaveLength(15);
    expect(questions.D).toHaveLength(12);
    expect(questions.E).toHaveLength(11);
  });

  it('catches a duplicate planted into a copy, so the check itself cannot pass vacuously', () => {
    const planted: Record<Letter, Question[]> = {
      ...questions,
      B: [...questions.B, { id: 'B9.9', text: 'May we publish the boundaries?' }],
    };

    const found = duplications(SPLITS, planted);

    expect(found).toHaveLength(1);
    expect(found[0]).toContain('B9.9');
    expect(found[0]).toContain('C2.6');
  });
});

/**
 * The other direction of the same seam: PROJECT.md's open questions that a questionnaire asks,
 * each paired with the document that asks it. The pairing is the invariant — the question is asked
 * once (in the questionnaire) and recorded once (in PROJECT.md), joined by the link this holds. A
 * pointer edited away fails it; before the audit of 2026-10-11, questions 5, 12, 17 and 25 read as
 * open in PROJECT.md with no way to the ask.
 */
const ASKED_BY: readonly { question: number; document: string }[] = [
  { question: 5, document: 'to-questionnaire-backend.md' },
  { question: 12, document: 'to-questionnaire-sign-in.md' },
  { question: 17, document: 'to-questionnaire-backend.md' },
  { question: 20, document: 'to-questionnaire-verification.md' },
  { question: 25, document: 'to-questionnaire-sign-in.md' },
];

/** The open questions of PROJECT.md, number → the item's text with its line breaks joined. */
function openQuestionsInProject(): Map<number, string> {
  const source = readFileSync(join(ROOT, 'PROJECT.md'), 'utf8');
  const start = source.indexOf('## Open questions');
  const end = source.indexOf('\n## ', start + 1);
  const items = new Map<number, string>();

  if (start === -1) {
    return items;
  }

  let current: number | null = null;

  for (const line of source.slice(start, end === -1 ? undefined : end).split('\n')) {
    const heading = /^(\d+)\. (.*)$/.exec(line);

    if (heading !== null) {
      current = Number(heading[1]);
      items.set(current, heading[2]);
    } else if (current !== null) {
      items.set(current, `${items.get(current) ?? ''} ${line.trim()}`);
    }
  }

  return items;
}

describe('the open questions a questionnaire asks', () => {
  it('names the asking document on each open question it records', () => {
    const questions = openQuestionsInProject();

    for (const { question, document } of ASKED_BY) {
      const text = questions.get(question);

      expect(text).toBeDefined();
      expect(text).toContain(document);
      expect(existsSync(join(ROOT, document))).toBe(true);
    }
  });

  it('reads the open questions, so the scan cannot pass vacuously', () => {
    // The section's own count at the time of writing; a parse that stops finding items fails here
    // before any pointer above can pass on an empty map.
    expect(openQuestionsInProject().size).toBeGreaterThanOrEqual(26);
  });
});
