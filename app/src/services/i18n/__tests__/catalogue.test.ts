/// <reference types="node" />
// Node's file APIs, for the source scan below. `tsconfig.json` restricts the automatic
// type set to `jest`, so this file asks for the other one it needs by name.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, sep } from 'node:path';

import { SUPPORTED_LOCALES, getCatalogue } from '../index';
import { en } from '../locales/en';
import type { TranslationKey } from '../locales/en';

/**
 * Guards the catalogue the way a compiler cannot: TypeScript catches a *missing* key
 * in a translation, but not an empty string, a stray key or a placeholder that was
 * dropped while translating. Adding Swedish means adding one catalogue and one entry
 * in `SUPPORTED_LOCALES`; these tests then hold it to the same contract.
 *
 * It also catches the opposite mistake — a key no screen renders any more. Nothing in
 * the type system can see that: `translate` is total over the catalogue, so only the
 * call sites can say whether a string still has one, and a retired key would otherwise
 * be translated, reviewed and shipped in every catalogue forever.
 *
 * Translation *quality* cannot be tested here — see PROJECT.md's open questions.
 */
const englishKeys = Object.keys(en) as TranslationKey[];

/** `src/`, from this file (`src/services/i18n/__tests__/`). */
const SOURCE_DIRECTORY = join(__dirname, '..', '..', '..');
const CATALOGUE_DIRECTORY = join(__dirname, '..', 'locales');

function placeholders(value: string): string[] {
  return (value.match(/\{\w+\}/g) ?? []).sort();
}

/**
 * A catalogue key written as a literal: dotted camelCase segments, with the closing
 * quote required so a longer string that merely starts like a key is not one.
 *
 * A segment may carry a digit after its first letter — screen 06's two keys end in `a11y`,
 * which `[A-Za-z]+` alone would not have found, and a key this scan cannot see is a key it
 * reports as dead copy.
 */
const KEY_LITERAL = /'([a-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+)'/g;

/**
 * The keys a file names, comments removed first. A retired key left behind in prose is
 * exactly the accumulation the guard below is for, and prose is not a call site.
 */
function keysNamedIn(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');

  return [...code.matchAll(KEY_LITERAL)].map((match) => match[1]!);
}

/**
 * True for the app's own code. A test that names a key proves what `translate` returns,
 * not that a screen shows it — `translate.test.ts` names three keys nothing renders — and
 * a catalogue is where a key is allowed to sit without a caller.
 */
function isAppSource(path: string): boolean {
  return (
    !path.includes(`${sep}__tests__${sep}`) &&
    !/\.(test|spec)\.[jt]sx?$/.test(path) &&
    !path.startsWith(CATALOGUE_DIRECTORY)
  );
}

/** Every TypeScript file under a directory, recursively. */
function sourceFilesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return sourceFilesIn(path);

    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

/** The catalogue keys the app's own source names. */
function keysTheAppNames(): Set<string> {
  const named = new Set<string>();

  for (const path of sourceFilesIn(SOURCE_DIRECTORY).filter(isAppSource)) {
    for (const key of keysNamedIn(readFileSync(path, 'utf8'))) {
      named.add(key);
    }
  }

  return named;
}

describe('the keys a file names', () => {
  it('finds a key the app calls', () => {
    expect(keysNamedIn("const { t } = useTranslation(); t('onboarding.welcome.title')")).toEqual([
      'onboarding.welcome.title',
    ]);
  });

  it('finds both keys of a conditional call', () => {
    // Screen 03's password reveal: one key per branch, both rendered depending on state.
    expect(keysNamedIn("t(visible ? 'common.showPassword' : 'common.hidePassword')")).toEqual([
      'common.showPassword',
      'common.hidePassword',
    ]);
  });

  it('does not count a key that only prose still mentions', () => {
    expect(keysNamedIn("// was t('onboarding.welcome.retired')\n/* t('common.gone') */")).toEqual(
      [],
    );
  });

  it('does not mistake a longer literal for the key it starts with', () => {
    expect(keysNamedIn("'onboarding.welcome.title-something-else'")).toEqual([]);
  });

  it('finds a key whose last segment carries a digit', () => {
    // The shape screen 06's accessible names take: `discover.zone.a11y`. The scan reads
    // source, so a key it cannot spell out is a key it reports as dead copy.
    expect(keysNamedIn("t('discover.zone.a11y')")).toEqual(['discover.zone.a11y']);
  });
});

describe('catalogues', () => {
  it('has one for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(getCatalogue(locale)).length).toBeGreaterThan(0);
    }
  });

  it.each([...SUPPORTED_LOCALES])('%s translates every key', (locale) => {
    const catalogue = getCatalogue(locale);

    const untranslated = englishKeys.filter(
      (key) => typeof catalogue[key] !== 'string' || catalogue[key].trim() === '',
    );

    expect(untranslated).toEqual([]);
  });

  it.each([...SUPPORTED_LOCALES])('%s carries no key the source language lacks', (locale) => {
    const strayKeys = Object.keys(getCatalogue(locale)).filter(
      (key) => !englishKeys.includes(key as TranslationKey),
    );

    expect(strayKeys).toEqual([]);
  });

  it.each([...SUPPORTED_LOCALES])('%s carries no key the app never names', (locale) => {
    const named = keysTheAppNames();
    const catalogue = getCatalogue(locale);

    // Dead copy is translated, reviewed and shipped in every catalogue while no screen
    // renders it: delete a retired string from every catalogue, do not leave it behind.
    const dead = englishKeys
      .filter((key) => !named.has(key))
      .map((key) => `${key}: “${catalogue[key]}”`);

    expect(dead).toEqual([]);
  });

  it.each([...SUPPORTED_LOCALES])('%s keeps the promise tags on one line', (locale) => {
    // The design sets these three tags in equal thirds of the 342 px content column,
    // each on a single line: a third is ~111 px, and 12 px semibold fits 17–18
    // characters there (measured in the running app — “Private by nature” fits at 17,
    // “Yksityinen luonnostaan” wrapped at 22). A longer translation silently adds a
    // second line and pushes the whole column down, which is what this catches.
    const budget = 18;
    const catalogue = getCatalogue(locale);

    const tooLong = englishKeys
      .filter((key) => key.startsWith('onboarding.welcome.tag.'))
      .filter((key) => catalogue[key].length > budget)
      .map((key) => `${key}: “${catalogue[key]}” (${catalogue[key].length} characters)`);

    expect(tooLong).toEqual([]);
  });

  it.each([...SUPPORTED_LOCALES])('%s keeps every placeholder of its source string', (locale) => {
    const catalogue = getCatalogue(locale);

    const mismatched = englishKeys.filter(
      (key) => placeholders(en[key]).join(',') !== placeholders(catalogue[key]).join(','),
    );

    expect(mismatched).toEqual([]);
  });
});
