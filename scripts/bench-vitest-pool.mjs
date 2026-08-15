#!/usr/bin/env node
/**
 * Reproduces the "Timeout starting forks runner" flake on demand and compares
 * pool configurations against it.
 *
 * Vitest gives each worker 5 s to boot — WORKER_START_TIMEOUT, a hardcoded
 * constant in vitest/dist/chunks/cli-api.*.js with no config knob. On Windows a
 * cold worker under CPU contention does not always make it, and the run aborts
 * after having silently collected only part of the suite. The flake is
 * load-dependent, so this harness saturates every core before running.
 *
 * This is a diagnostic, not a gate: it is deliberately slow and deliberately
 * hostile to the machine. Run it when touching vitest.config.ts pool settings.
 *
 * Usage:  node scripts/bench-vitest-pool.mjs [runs]
 */
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { cpus } from 'node:os';

const RUNS = Number(process.argv[2] ?? 2);
const TEMP_CONFIG = 'vitest.bench.config.ts';

// eslint-disable-next-line no-control-regex
const stripAnsi = s => s.replace(/\[[0-9;]*m/g, '');

const saturateCores = () => {
  const burners = Array.from({ length: cpus().length }, () =>
    spawn(process.execPath, ['-e', 'while(true){Math.sqrt(Math.random())}'], { stdio: 'ignore' })
  );
  return () => burners.forEach(b => b.kill('SIGKILL'));
};

const runSuite = args => {
  const startedAt = process.hrtime.bigint();
  const proc = spawnSync('npx', ['vitest', 'run', '--reporter=dot', ...args], {
    encoding: 'utf8',
    shell: true,
  });
  const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  const out = stripAnsi(`${proc.stdout ?? ''}${proc.stderr ?? ''}`);
  const files = out.match(/Test Files\s+(\d+) passed\s+\((\d+)\)/);
  const tests = out.match(/Tests\s+(\d+) passed\s+\((\d+)\)/);
  return {
    code: proc.status,
    files: files ? `${files[1]}/${files[2]}` : 'non rapporté',
    tests: tests ? `${tests[1]}/${tests[2]}` : 'non rapporté',
    timeouts: (out.match(/Timeout starting \w+ runner/g) ?? []).length,
    seconds: seconds.toFixed(1),
  };
};

const derive = body => `import base from './vitest.config.ts';
export default { ...base, test: { ...base.test, ${body} } };`;

const CONFIGS = [
  { label: 'depot (fileParallelism:false)', config: null },
  { label: 'forks parallele', config: derive('fileParallelism: true') },
  { label: 'threads parallele', config: derive("pool: 'threads', fileParallelism: true") },
];

console.log(`${cpus().length} coeurs saturés pendant chaque run, ${RUNS} run(s) par configuration.\n`);
for (const { label, config } of CONFIGS) {
  if (config) writeFileSync(TEMP_CONFIG, config);
  const args = config ? ['--config', TEMP_CONFIG] : [];
  console.log(`=== ${label}`);
  for (let i = 0; i < RUNS; i += 1) {
    const stopLoad = saturateCores();
    const r = runSuite(args);
    stopLoad();
    const verdict = r.code === 0 && r.timeouts === 0 ? 'ok   ' : 'ÉCHEC';
    console.log(`  ${verdict} run ${i + 1}  fichiers=${r.files}  tests=${r.tests}  timeouts=${r.timeouts}  ${r.seconds}s`);
  }
  if (config) rmSync(TEMP_CONFIG, { force: true });
  console.log('');
}
