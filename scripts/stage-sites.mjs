import { cpSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

if (!existsSync('.open-next/worker.js')) throw new Error('Build OpenNext first.');
const bundled = spawnSync(process.execPath, [
  resolve('node_modules/wrangler/bin/wrangler.js'), 'deploy', '--dry-run', '--outdir', 'dist/server',
], { stdio: 'inherit' });
if (bundled.status !== 0) process.exit(bundled.status ?? 1);
mkdirSync('dist/client', { recursive: true });
cpSync('.open-next/assets', 'dist/client', { recursive: true });
mkdirSync('dist/.openai', { recursive: true });
cpSync('.openai/hosting.json', 'dist/.openai/hosting.json');
cpSync('drizzle', 'dist/.openai/drizzle', { recursive: true });
renameSync('dist/server/worker.js', 'dist/server/index.js');
console.log('Sites Worker, assets and migrations are ready.');
