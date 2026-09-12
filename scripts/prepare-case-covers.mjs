import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const raw = JSON.parse(await readFile(new URL('src/lib/catalog.json', root), 'utf8'));
const directory = new URL('public/art/cases/', root);
await mkdir(directory, { recursive: true });
let cursor = 0;
const hashes = new Map();
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < raw.cases.length) {
    const box = raw.cases[cursor++];
    assert.match(box.id, /^[a-zA-Z0-9_-]+$/);
    const destination = new URL(box.id + '.png', directory);
    let data;
    try { await access(destination); data = await readFile(destination); } catch {
      const url = new URL(box.image);
      assert.equal(url.hostname, 'cdn6.gamecontent.io');
      let failure;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
          if (!response.ok) throw new Error(box.id + ': HTTP ' + response.status);
          data = Buffer.from(await response.arrayBuffer());
          assert.ok(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), box.id + ': PNG expected');
          await writeFile(destination, data); break;
        } catch (error) { failure = error; }
      }
      if (!data) throw failure;
    }
    hashes.set(box.id, createHash('sha256').update(data).digest('hex'));
  }
}));
assert.equal(hashes.size, raw.cases.length);
assert.equal(new Set(hashes.values()).size, raw.cases.length, 'Case artwork must be distinct');
console.log(JSON.stringify({ covers: hashes.size, distinctImages: new Set(hashes.values()).size }));
