/**
 * E2E Global Setup — starts/stops Next.js dev server
 *
 * ISO 25010 §6.1 Functional Suitability: ensures real server for E2E tests
 */
import { spawn, exec, type ChildProcess } from 'child_process';

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;
let serverProcess: ChildProcess;

async function waitForServer(timeout = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(BASE_URL);
      if (res.status < 500) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Next.js server did not start within ${timeout}ms`);
}

export async function setup(): Promise<void> {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- E2E setup: spawning local dev server with fixed args
  serverProcess = spawn('npx', ['next', 'dev', '--turbopack', '-p', String(PORT)], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development', BROWSER: 'none' },
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes('Error') && !msg.includes('ExperimentalWarning')) {
      console.error('[E2E Server]', msg);
    }
  });

  await waitForServer();
}

export async function teardown(): Promise<void> {
  if (!serverProcess?.pid) return;

  if (process.platform === 'win32') {
    // eslint-disable-next-line sonarjs/os-command, security/detect-child-process -- E2E teardown: killing own child process by known PID
    exec(`taskkill /pid ${serverProcess.pid} /f /t`);
  } else {
    serverProcess.kill('SIGTERM');
  }
}
