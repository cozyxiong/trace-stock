export function formatPrice(value: number): string {
  return value.toFixed(2)
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—'
  const text = `${Math.abs(value).toFixed(2)}%`
  if (value > 0) return `+${text}`
  if (value < 0) return `-${text}`
  return text
}

export function formatVolume(value: number): string {
  return value.toLocaleString('zh-CN')
}

export function formatCompactVolume(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}K`
  return `${sign}${abs.toFixed(0)}`
}
