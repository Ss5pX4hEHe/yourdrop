import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { configureCases } from '../src/lib/case-settings.ts';
import { upgradePriceRange, resolveUpgradeChance } from '../src/lib/upgrade.ts';

const raw = JSON.parse(readFileSync(new URL('../src/lib/catalog.json', import.meta.url), 'utf8'));
const boxes = configureCases(raw.cases, raw.items);
assert.equal(boxes.length, 169);
assert.equal(new Set(boxes.map(b => b.name)).size, boxes.length);
assert.equal(new Set(boxes.map(b => b.image)).size, boxes.length);
const coverHashes = boxes.map(b => createHash('sha256').update(readFileSync(new URL('../public' + b.image, import.meta.url))).digest('hex'));
assert.equal(new Set(coverHashes).size, boxes.length);
const prices = new Map(raw.items.map(i => [i.id, i.price]));
let before = 0, after = 0, previous = 0, profitGain = 0;
for (const [index, box] of boxes.entries()) {
  const original = raw.cases[index];
  assert.equal(box.id, original.id, 'Preserve existing case links');
  assert.notEqual(box.name, original.name);
  assert.equal(box.items.length, original.items.length);
  assert.ok(box.items.every(i => i.weight > 0 && Number.isFinite(i.weight)));
  assert.ok(Math.abs(box.items.reduce((sum, i) => sum + i.weight, 0) - 1) < 1e-10);
  const cost = box.price * (box.currency === 'BCN' ? .1 : 1);
  const norm = original.items.reduce((sum, i) => sum + i.weight, 0);
  const oldEV = original.items.reduce((sum, i) => sum + i.weight / norm * prices.get(i.id), 0);
  const newEV = box.items.reduce((sum, i) => sum + i.weight * prices.get(i.id), 0);
  assert.ok(newEV >= oldEV - 1e-8, box.id);
  assert.ok(newEV <= oldEV + cost * .055 + 1e-8, box.id);
  const oldProfit = original.items.reduce((sum, i) => sum + (prices.get(i.id) >= cost ? i.weight / norm : 0), 0);
  const newProfit = box.items.reduce((sum, i) => sum + (prices.get(i.id) >= cost ? i.weight : 0), 0);
  assert.ok(newProfit >= oldProfit - 1e-10 && newProfit <= oldProfit + .04 + 1e-10, box.id);
  const winningMean = oldProfit ? original.items.reduce((sum, i) => sum + (prices.get(i.id) >= cost ? i.weight / norm * prices.get(i.id) : 0), 0) / oldProfit : 0;
  const previousMix = winningMean > oldEV && oldProfit < 1 ? Math.min(.03, Math.min(cost * .04, oldEV * .05) / (winningMean - oldEV)) : 0;
  const previousEV = oldEV + previousMix * (winningMean - oldEV);
  assert.ok(newEV >= previousEV - 1e-8 && newEV <= previousEV + cost * .015 + 1e-8, box.id + ': extra return capped');
  assert.ok(newProfit - (oldProfit + previousMix * (1 - oldProfit)) <= .01 + 1e-10);
  previous += previousEV / cost;
  profitGain += newProfit - (oldProfit + previousMix * (1 - oldProfit));
  before += oldEV / cost; after += newEV / cost;
}
for (const stake of [1, 10, 99, 100, 12345, 100000, 99999999]) {
  for (let percent = 1; percent <= 75; percent++) {
    const range = upgradePriceRange(stake, percent);
    if (!range) { assert.ok(Math.floor(stake * 90 / percent) <= stake, 'No valid kopeck price for a tiny stake'); continue; }
    assert.ok(range && range.min > stake && range.min <= range.max);
    for (const price of [range.min, range.max]) assert.equal(resolveUpgradeChance(stake, price, percent / 100), percent / 100);
  }
}
for (const stake of [0, -1, NaN, Infinity, 1.5]) assert.equal(upgradePriceRange(stake, 50), null);
for (const percent of [0, 76, NaN, Infinity]) assert.equal(upgradePriceRange(100, percent), null);
for (const chance of [0, .76, NaN, Infinity, '0.5']) assert.throws(() => resolveUpgradeChance(100, 150, chance));
assert.throws(() => resolveUpgradeChance(100, 1000, .5));
assert.equal(resolveUpgradeChance(100, 200), .45);
assert.equal(resolveUpgradeChance(100, 101), .75);
// Sparse catalogs still return the closest chance from above, even outside the old 5% band.
const range = upgradePriceRange(10000, 50);
const sparse = [10000, 11000, 14000, 20000].filter(p => p >= range.min && p <= range.max).sort((a, b) => b - a);
assert.deepEqual(sparse, [14000, 11000]);
assert.ok(resolveUpgradeChance(10000, sparse[0]) > .5);
const catalogPrices = raw.items.filter(i => i.type !== 'bonus').map(i => Math.round(i.price * 100));
for (const stake of [10, 10000, 123456]) for (const percent of [1, 17, 50, 75]) {
  const band = upgradePriceRange(stake, percent);
  const candidates = catalogPrices.filter(p => p >= band.min && p <= band.max).sort((a, b) => b - a);
  const brute = catalogPrices.filter(p => p > stake && resolveUpgradeChance(stake, p) + 1e-12 >= percent / 100).sort((a, b) => b - a);
  assert.deepEqual(candidates, brute);
}
console.log(JSON.stringify({ cases: boxes.length, distinctCovers: coverHashes.length, probabilityChecks: 525, averageReturnBefore: before / boxes.length, previousReturn: previous / boxes.length, averageReturnAfter: after / boxes.length, extraBreakEvenProbability: profitGain / boxes.length }));
