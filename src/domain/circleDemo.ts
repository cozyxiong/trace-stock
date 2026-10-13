import { CRCL_DAILY } from './crclDaily'
import { centsToPrice, percentFromCents } from './money'

export const SYMBOL = 'CRCL'
export const COMPANY = 'Circle'
export const EXCHANGE = 'NYSE'
export const CURRENCY = 'USD'
/** First completed session after the 2025-06-05 listing day. */
export const FIRST_TRADE_DATE = '2025-06-06'
/** Last completed session in the snapshot. 2026-10-12 was still in progress. */
export const AS_OF_TRADE_DATE = '2026-10-09'
export const DEFAULT_TRADE_DATE = '2026-09-15'
export const ANOMALY_THRESHOLD = 5
export const SEVERE_THRESHOLD = 8

const EXPECTED_ANOMALY_COUNT = 126
const EXPECTED_CHANGE: Record<string, number | null> = {
  '2025-06-06': null,
  '2025-06-18': 33.82,
  '2025-08-15': 7.2,
  '2025-12-01': -4.99,
  '2026-02-25': 35.47,
  '2026-03-24': -20.11,
  '2026-06-30': -17.55,
  '2026-09-02': -0.94,
  '2026-09-03': 16.46,
  '2026-09-15': -11.41,
  '2026-09-16': -6.78,
  '2026-10-06': 1,
  '2026-10-09': 4.54,
}

export type Direction = '上涨' | '下跌'
export type Severity = '中等' | '显著'

export type SessionQuote = {
  symbol: typeof SYMBOL
  tradeDate: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  changePercent: number | null
  invalid: boolean
  problems: string[]
  anomaly: boolean
  direction: Direction | null
  severity: Severity | null
  reason: string | null
}

export type CircleDemo = {
  sessions: SessionQuote[]
  chartBars: SessionQuote[]
}

function toCents(price: number): number {
  return Math.round(price * 100)
}

function formatSignedPercent(value: number): string {
  const text = `${Math.abs(value).toFixed(2)}%`
  return value > 0 ? `+${text}` : value < 0 ? `-${text}` : text
}

function anomalyReason(changePercent: number, severity: Severity): string {
  return `收盘价相对前一有效收盘价的涨跌幅为 ${formatSignedPercent(changePercent)}，绝对值达到 ${ANOMALY_THRESHOLD.toFixed(2)}%，严重程度为${severity}。`
}

function assertTradableBar(bar: SessionQuote): void {
  const upper = Math.max(bar.open, bar.close, bar.low)
  const lower = Math.min(bar.open, bar.close, bar.high)
  if (bar.high < upper || bar.low > lower || bar.volume < 0) {
    throw new Error(`${bar.tradeDate} 被当作正常行情，但价格或成交量不合法`)
  }
}

export function tradingSessions(): string[] {
  return CRCL_DAILY.map((bar) => bar.tradeDate)
}

export function buildCircleDemo(): CircleDemo {
  const dates = tradingSessions()
  if (dates[0] !== FIRST_TRADE_DATE || dates[dates.length - 1] !== AS_OF_TRADE_DATE) {
    throw new Error(`行情区间应为 ${FIRST_TRADE_DATE} 至 ${AS_OF_TRADE_DATE}`)
  }
  if (dates.includes('2025-06-05') || dates.includes('2026-10-12')) {
    throw new Error('上市当日和未完成的 2026-10-12 不应进入交易日')
  }
  if (new Set(dates).size !== dates.length) {
    throw new Error('交易日重复')
  }

  let previousValidClose: number | null = null
  const quotes: SessionQuote[] = CRCL_DAILY.map((bar) => {
    const closeCents = toCents(bar.close)
    const changePercent =
      previousValidClose === null ? null : percentFromCents(closeCents, previousValidClose)
    const anomaly = changePercent !== null && Math.abs(changePercent) >= ANOMALY_THRESHOLD
    const direction: Direction | null =
      changePercent === null ? null : changePercent >= 0 ? '上涨' : '下跌'
    const severity: Severity | null =
      changePercent === null
        ? null
        : Math.abs(changePercent) >= SEVERE_THRESHOLD
          ? '显著'
          : anomaly
            ? '中等'
            : null
    previousValidClose = closeCents

    const quote: SessionQuote = {
      symbol: SYMBOL,
      tradeDate: bar.tradeDate,
      open: centsToPrice(toCents(bar.open)),
      high: centsToPrice(toCents(bar.high)),
      low: centsToPrice(toCents(bar.low)),
      close: centsToPrice(closeCents),
      volume: bar.volume,
      changePercent,
      invalid: false,
      problems: [],
      anomaly,
      direction: anomaly ? direction : null,
      severity: anomaly ? severity : null,
      reason:
        anomaly && changePercent !== null && severity
          ? anomalyReason(changePercent, severity)
          : null,
    }
    assertTradableBar(quote)
    return quote
  })

  const anomalies = quotes.filter((quote) => quote.anomaly)
  if (anomalies.length !== EXPECTED_ANOMALY_COUNT) {
    throw new Error(`异动日 ${anomalies.length} 个，应为 ${EXPECTED_ANOMALY_COUNT}`)
  }
  for (const [tradeDate, expected] of Object.entries(EXPECTED_CHANGE)) {
    const quote = quotes.find((item) => item.tradeDate === tradeDate)
    if (!quote) throw new Error(`缺少交易日 ${tradeDate}`)
    const actual = quote.changePercent === null ? 'null' : quote.changePercent.toFixed(2)
    const wanted = expected === null ? 'null' : expected.toFixed(2)
    if (actual !== wanted) {
      throw new Error(`${tradeDate} 涨跌幅应为 ${wanted}，实际是 ${actual}`)
    }
  }

  return {
    sessions: quotes,
    chartBars: quotes.filter((quote) => !quote.invalid),
  }
}

export const circleDemo = buildCircleDemo()

export function sessionByDate(tradeDate: string): SessionQuote | undefined {
  return circleDemo.sessions.find((session) => session.tradeDate === tradeDate)
}

export function sessionButtonLabel(session: SessionQuote): string {
  if (session.invalid) return `${session.tradeDate} 数据异常`
  if (session.changePercent === null) return session.tradeDate
  const percent = formatSignedPercent(session.changePercent)
  if (!session.anomaly || !session.direction || !session.severity) {
    return `${session.tradeDate} ${percent}`
  }
  return `${session.tradeDate} ${percent} 异动 ${session.direction} ${session.severity}`
}
