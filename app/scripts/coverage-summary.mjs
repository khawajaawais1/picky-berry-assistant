#!/usr/bin/env node
/**
 * Prints the last coverage run as a Markdown table for the CI job summary.
 *
 * It reads the same report the threshold checks, so the number a reviewer sees and the number
 * that passed or failed the gate cannot disagree. A run that died before writing the report
 * prints a note instead of failing the summary step.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));
const METRICS = ['statements', 'branches', 'functions', 'lines'];

let report;
try {
  report = JSON.parse(readFileSync(join(appDir, 'coverage', 'coverage-summary.json'), 'utf8'));
} catch {
  console.log('_Coverage report was not produced (the test run did not finish)._');
  process.exit(0);
}

let floors = {};
try {
  floors = JSON.parse(readFileSync(join(appDir, 'coverage-thresholds.json'), 'utf8'));
} catch {
  // The summary can still be printed if the floor file is missing; CI will fail on the gate.
}

console.log('| Metric | Covered | Total | % | Floor |');
console.log('| --- | ---: | ---: | ---: | ---: |');
for (const metric of METRICS) {
  const { covered, total, pct } = report.total[metric];
  const label = metric[0].toUpperCase() + metric.slice(1);
  console.log(`| ${label} | ${covered} | ${total} | ${pct}% | ${floors[metric] ?? '-'}% |`);
}
