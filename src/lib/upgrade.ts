// Values are integer kopecks; the selected percentage is 1–75.
export function upgradePriceRange(stake: number, percent: number) {
  if (!Number.isSafeInteger(stake) || stake <= 0 || !Number.isFinite(percent) || percent < 1 || percent > 75) return null;
  const max = Math.floor(stake * 90 / percent);
  // Descending prices put the nearest available chance first. Do not exclude
  // cheaper fallback targets when the catalog has gaps around the ideal price.
  const min = stake + 1;
  return min <= max ? { min, max } : null;
}

export function resolveUpgradeChance(stake: number, target: number, requested?: number) {
  const maximum = target > stake && stake > 0 ? Math.min(0.75, stake / target * 0.9) : 0;
  if (requested === undefined) return maximum;
  if (typeof requested !== 'number' || !Number.isFinite(requested) || requested < 0.01 || requested > 0.75) {
    throw new Error('Выберите шанс от 1 до 75%');
  }
  if (requested > maximum + 1e-12) throw new Error('Для этой цели недостаточно ставки при выбранном шансе. Выберите другой предмет или уменьшите процент');
  return requested;
}
