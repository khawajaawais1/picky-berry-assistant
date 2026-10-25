/// <reference types="node" />
// Node's file APIs, for reading the ADRs and the documents that cite them. `tsconfig.json`
// restricts the automatic type set to `jest`, so this file asks for the other one it needs by name.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * An ADR is only an ADR if it exists: `ADR-040` in a comment is a promise that a file makes, and
 * the repository has been carrying promises it could not keep.
 *
 * Three of them, found on 2026-10-11 while finishing frame 13 and the account surface: the shipped
 * code cited **ADR-040**, **ADR-041** and **ADR-042** — in `your-data.tsx`, in
 * `account-security-screen.tsx`, in the downloads module and in two test files — and only the first
 * two had been written when the citing files were. Nothing failed: `docs/adr/README.md` still
 * indexed the ADRs that existed, the numbering had a gap, and a reader following the reference
 * landed on nothing. That is the defect this file exists for.
 *
 * It asserts three things, all of them about the same invariant — *the record says what is there*:
 *
 * 1. **Every reference resolves.** Each `ADR-NNN` in the repository's own text names an ADR file.
 *    The scan covers the code (`src/`), the browser harness (`e2e/`), the documents (`docs/`) and
 *    the root Markdown (PROJECT.md and the questionnaires).
 * 2. **The index is complete, in both directions.** `docs/adr/README.md` lists every ADR file and
 *    nothing that is not one — an ADR written and left unindexed is as unreachable as a dangling
 *    reference, and only one of the two is visible from the file that cites it.
 * 3. **PROJECT.md's decision list names every ADR**, which is the rule `docs/adr/README.md` itself
 *    states (“Keep the decision list in PROJECT.md in sync”).
 *
 * What it does **not** check: whether an ADR's content matches the code, whether its status line is
 * current, or whether the decision it records was the right one. Those are review questions, and an
 * accepted ADR is never rewritten anyway (AGENTS.md §6).
 *
 * It lives in `src/config/__tests__` for the reason `verify-gate.test.ts` and
 * `questionnaire-reconciliation.test.ts` do: it guards the project's documents rather than a
 * module's behaviour, and `npm run verify` runs it in the gate.
 */

/** The repository root: this file is `src/config/__tests__/`. */
const ROOT = join(__dirname, '..', '..', '..');

/** Where the ADRs live, relative to the root. */
const ADR_DIRECTORY = 'docs/adr';

/**
 * The directories the scan walks, and the directories it must not. Build output is excluded for the
 * reason the coverage config excludes it: it is a copy of the source, and a reference in it is the
 * source's reference. `node_modules` is excluded because third-party text is not this repository's
 * to police (and one dependency's changelog mentions an “ADR-…”, which is not our numbering).
 */
const SCANNED = ['src', 'e2e', 'docs'] as const;
const IGNORED = new Set(['node_modules', 'dist', 'dist-production', 'coverage', '.expo', '.git']);
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md'] as const;

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

/** Every file worth scanning under `directory`, as root-relative paths. */
function scanFiles(directory: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) {
      continue;
    }

    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...scanFiles(path));
    } else if (EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      found.push(path);
    }
  }

  return found;
}

/** The root's own Markdown, which is where the project's status documents live. */
function rootMarkdown(): string[] {
  return readdirSync(join(ROOT), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);
}

/** The numbers of the ADRs that exist, from the filenames: `ADR-040-….md` → `040`. */
function adrFiles(): string[] {
  const directory = join(ROOT, ADR_DIRECTORY);

  if (!existsSync(directory)) {
    // A wrong ROOT would otherwise read as “no ADRs”, which is a passing test that checks nothing —
    // the one failure mode a guard must not have.
    throw new Error(`no ADR directory at ${directory}: this file's repository root is wrong`);
  }

  return readdirSync(directory)
    .filter((name) => /^ADR-\d+.*\.md$/.test(name))
    .sort();
}

function adrNumberOf(fileName: string): string {
  const match = /^ADR-(\d+)/.exec(fileName);

  if (!match) {
    throw new Error(`an ADR file is named ADR-NNN-…, got ${fileName}`);
  }

  return match[1];
}

describe('the ADR record', () => {
  const files = adrFiles();
  const numbers = new Set(files.map(adrNumberOf));

  it('has one file per number, so no two ADRs claim the same one', () => {
    expect(files.length).toBe(numbers.size);
  });

  it('resolves every ADR the repository cites', () => {
    const dangling: string[] = [];

    for (const path of [...SCANNED.flatMap(scanFiles), ...rootMarkdown()]) {
      const text = read(path);

      for (const [, cited] of text.matchAll(/\bADR-(\d+)\b/g)) {
        // The padding is irrelevant — a citation may write `ADR-5` and the file will be `ADR-005` —
        // so both sides are compared as numbers, without the leading zeros.
        const number = String(Number(cited));

        if (![...numbers].some((existing) => String(Number(existing)) === number)) {
          dangling.push(`${path} cites ADR-${cited}, which no file in ${ADR_DIRECTORY}/ records`);
        }
      }
    }

    // Named rather than counted, so a failure says which document promised what.
    expect(dangling).toEqual([]);
  });

  it('indexes every ADR in docs/adr/README.md, and nothing else', () => {
    const index = read(`${ADR_DIRECTORY}/README.md`);
    const indexed = new Set(
      [...index.matchAll(/\bADR-(\d+)\b/g)].map(([, number]) => Number(number)),
    );
    const onDisk = new Set([...numbers].map(Number));

    const missing = [...onDisk]
      .filter((number) => !indexed.has(number))
      .map((number) => `ADR-${number} exists but is not in ${ADR_DIRECTORY}/README.md`);
    const phantom = [...indexed]
      .filter((number) => !onDisk.has(number))
      .map((number) => `${ADR_DIRECTORY}/README.md lists ADR-${number}, which does not exist`);

    expect([...missing, ...phantom]).toEqual([]);
  });

  it('names every ADR in PROJECT.md’s decision list', () => {
    const project = read('PROJECT.md');
    const list = /## Important decisions\n\n([\s\S]*?)\n\n## /.exec(project);

    expect(list).not.toBeNull();

    const named = new Set(
      [...(list?.[1] ?? '').matchAll(/\bADR-(\d+)\b/g)].map(([, number]) => Number(number)),
    );
    const onDisk = new Set([...numbers].map(Number));

    // Only the direction the rule states — every ADR is listed. PROJECT.md is a status document
    // (AGENTS.md §6), and a decision it once recorded is not un-recorded by removing a row, which
    // is why the check below is narrow: the list may not lose an ADR.
    expect([...onDisk].filter((number) => !named.has(number)).sort((a, b) => a - b)).toEqual([]);
  });
});

/**
 * The scan is only as good as its reach: a document the scan does not read is a citation it cannot
 * check, and a wrong root would read as “nothing cites anything”, which is a passing test that
 * checks nothing — the one failure mode a guard must not have.
 */
describe('the scan itself', () => {
  const scanned = [...SCANNED.flatMap(scanFiles), ...rootMarkdown()];

  it('reaches every place a citation lives', () => {
    // The three kinds: the code and its tests, the ADRs' own cross-references, and the documents.
    expect(scanned.some((path) => path.startsWith('src/'))).toBe(true);
    expect(scanned.some((path) => path.startsWith(`${ADR_DIRECTORY}/`))).toBe(true);
    expect(scanned).toContain('PROJECT.md');
  });

  it('leaves out what is not this repository’s to police', () => {
    expect(scanned.filter((path) => IGNORED.has(path.split('/')[0] ?? ''))).toEqual([]);
  });
});
