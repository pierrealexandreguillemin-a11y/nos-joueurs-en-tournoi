#!/usr/bin/env node
/**
 * Calibrates check-design-tokens.mjs in both directions.
 *
 * A gate trusted on its own word is not a gate: it has to be shown failing on a
 * known-faulty tree and passing on the corrected one. The two fixtures under
 * scripts/__fixtures__/ differ only by one injected fault per finding class.
 *
 * Usage:  node scripts/calibrate-design-tokens.mjs
 * Exit:   0 = the gate behaves as specified, 1 = it does not.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, 'check-design-tokens.mjs');

const run = fixture => {
  const result = spawnSync(process.execPath, [GATE, join(HERE, '__fixtures__', fixture)], {
    encoding: 'utf8',
  });
  return { code: result.status, out: result.stdout ?? '' };
};

const CASES = [
  {
    fixture: 'clean',
    expectedCode: 0,
    expectedMarkers: [],
    forbiddenMarkers: ['COLLISION', 'FIGÉ', 'SOUS AA', 'ABSENT', 'PRÉFIXÉ', 'MUET'],
  },
  {
    fixture: 'broken',
    expectedCode: 1,
    // One marker per finding class, so a check that stops firing is caught.
    expectedMarkers: ['COLLISION', 'FIGÉ', 'SOUS AA', 'PRÉFIXÉ'],
    forbiddenMarkers: ['MUET'],
  },
];

let failures = 0;
for (const { fixture, expectedCode, expectedMarkers, forbiddenMarkers } of CASES) {
  const { code, out } = run(fixture);
  const problems = [];
  if (code !== expectedCode) problems.push(`code de sortie ${code}, attendu ${expectedCode}`);
  for (const marker of expectedMarkers) {
    if (!out.includes(marker)) problems.push(`"${marker}" absent du rapport`);
  }
  for (const marker of forbiddenMarkers) {
    if (out.includes(marker)) problems.push(`"${marker}" présent alors que l'arbre est sain`);
  }
  if (problems.length === 0) {
    console.log(`  ok    ${fixture.padEnd(8)} sortie ${code}` +
      (expectedMarkers.length ? ` — ${expectedMarkers.join(', ')} rapportés` : ' — aucun finding'));
  } else {
    failures += 1;
    console.log(`  ÉCHEC ${fixture.padEnd(8)} ${problems.join(' ; ')}`);
    console.log(out.split('\n').map(l => `        | ${l}`).join('\n'));
  }
}

console.log(
  failures === 0
    ? '\ncheck-design-tokens.mjs calibré dans les deux sens.'
    : `\n${failures} cas de calibration en échec — le gate ne prouve rien.`
);
process.exit(failures > 0 ? 1 : 0);
