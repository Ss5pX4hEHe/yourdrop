import { spawnSync } from 'node:child_process';
for (const args of [
  ['node_modules/next/dist/bin/next', 'build'],
  ['node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'build', '--skipNextBuild'],
  ['scripts/stage-sites.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
