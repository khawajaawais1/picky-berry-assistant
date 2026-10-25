#!/usr/bin/env node
/**
 * Raises the coverage floor to what the last `npm run test:coverage` measured.
 *
 * The floor is a ratchet: this script only ever writes a higher number, so a drop has to be
 * fixed in the code rather than recorded in the file. Run the coverage command first; the
 * report it writes is what this reads (TESTING.md §8).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));
const METRICS = ['statements', 'branches', 'functions', 'lines'];

let report;
try {
  report = JSON.parse(readFileSync(join(appDir, 'coverage', 'coverage-summary.json'), 'utf8'));
} catch {
  console.error(
    'coverage:ratchet: no coverage/coverage-summary.json; run `npm run test:coverage` first.',
  );
  process.exit(1);
}

const thresholdsPath = join(appDir, 'coverage-thresholds.json');
const current = JSON.parse(readFileSync(thresholdsPath, 'utf8'));
const next = {};
const raised = [];

for (const metric of METRICS) {
  const measured = Math.floor(report.total[metric].pct * 100) / 100;
  const floor = Math.max(current[metric] ?? 0, measured);
  next[metric] = floor;
  if (floor > (current[metric] ?? 0)) raised.push(`${metric} ${current[metric] ?? 0} -> ${floor}`);
}

writeFileSync(thresholdsPath, `${JSON.stringify(next, null, 2)}\n`);

if (raised.length > 0) {
  console.log(`coverage:ratchet: floor raised - ${raised.join(', ')}.`);
  console.log('Commit coverage-thresholds.json with the change that improved coverage.');
} else {
  console.log('coverage:ratchet: floor unchanged (coverage did not improve).');
}
