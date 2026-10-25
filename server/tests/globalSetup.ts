import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn, ChildProcess } from 'child_process';

const serverDir = process.cwd();

let mongo: MongoMemoryServer;
let server: ChildProcess;

async function waitForServer(url: string, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start within ${timeoutMs}ms`);
}

export async function setup({ provide }: any) {
  try {
    const stale = await fetch('http://localhost:3100/');
    if (stale.ok) {
      throw new Error('port 3100 is already in use; stop that process before running the tests');
    }
  } catch (err: any) {
    if (err.message?.includes('already in use')) throw err;
  }

  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('coursecompass_test');
  provide('mongoUri', uri);
  provide('baseUrl', 'http://localhost:3100/api/v1');

  server = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['ts-node-dev', '--transpile-only', '--no-notify', 'src/server.ts'],
    {
      cwd: serverDir,
      env: {
        ...process.env,
        DATABASE_URL: uri,
        PORT: '3100',
        NODE_ENV: 'test',
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '1h',
        JWT_REFRESH_EXPIRES_IN: '365d',
        SUPER_ADMIN_EMAIL: 'admin@bracu.ac.bd',
        SUPER_ADMIN_PASSWORD: 'Admin@1234',
      },
      stdio: 'inherit',
      shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    }
  );

  await waitForServer('http://localhost:3100/');
}

export async function teardown() {
  if (server?.pid) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-server.pid, 'SIGTERM');
    }
  }
  if (mongo) await mongo.stop();
}
