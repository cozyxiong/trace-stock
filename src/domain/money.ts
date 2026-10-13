/** Round half away from zero. JavaScript Math.round is not that for negatives. */
export function roundHalfAwayFromZero(value: number, digits = 2): number {
  const factor = 10 ** digits
  const rounded = Math.round(Math.abs(value) * factor) / factor
  return value < 0 ? -rounded : rounded
}

/** Percent change from integer cents, rounded half away from zero to 2 decimals. */
export function percentFromCents(closeCents: number, previousCents: number): number {
  const delta = closeCents - previousCents
  const scaled = (Math.abs(delta) * 10000) / previousCents
  const hundredths = Math.round(scaled)
  const value = hundredths / 100
  return delta < 0 ? -value : value
}

export function centsToPrice(cents: number): number {
  return cents / 100
}
