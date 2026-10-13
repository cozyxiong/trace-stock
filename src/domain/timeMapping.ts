import { tradingSessions } from './circleDemo'

export const EXCHANGE_TIME_ZONE = 'America/New_York'
export type ExchangeClock = {
  localDate: string
  localTime: string
  offset: string
  exchangeTime: string
}

export type MappingResult =
  | {
      status: 'mapped'
      mappedTradeDate: string
      clock: ExchangeClock
    }
  | {
      status: 'out_of_range'
      reason: string
      clock: ExchangeClock
    }

function clockInNewYork(publishedAt: string): ExchangeClock {
  const instant = new Date(publishedAt)
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`无法解析发布时间 ${publishedAt}`)
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: EXCHANGE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const hour = parts.hour === '24' ? '00' : parts.hour
  const localDate = `${parts.year}-${parts.month}-${parts.day}`
  const localTime = `${hour}:${parts.minute}:${parts.second}`
  const offset = (parts.timeZoneName ?? '').replace('GMT', '')
  return {
    localDate,
    localTime,
    offset,
    exchangeTime: `${localDate} ${localTime} ${offset}`,
  }
}

function isInSession(localTime: string): boolean {
  return localTime >= '09:30:00' && localTime < '16:00:00'
}

/** Map a zoned instant onto the recorded sessions. The browser zone is never read. */
export function mapPublishedAt(publishedAt: string, sessions = tradingSessions()): MappingResult {
  const clock = clockInNewYork(publishedAt)
  const first = sessions[0]
  const last = sessions[sessions.length - 1]
  if (!first || !last || clock.localDate < first) {
    return { status: 'out_of_range', reason: '纽约日期早于首个交易日', clock }
  }

  const nextSession = sessions.find((session) => session > clock.localDate) ?? null
  const onSession = sessions.includes(clock.localDate)
  if (!onSession) {
    if (!nextSession) return { status: 'out_of_range', reason: '日历中没有下一交易日', clock }
    return { status: 'mapped', mappedTradeDate: nextSession, clock }
  }

  if (isInSession(clock.localTime) || clock.localTime < '09:30:00') {
    return { status: 'mapped', mappedTradeDate: clock.localDate, clock }
  }
  if (!nextSession) return { status: 'out_of_range', reason: '日历中没有下一交易日', clock }
  return { status: 'mapped', mappedTradeDate: nextSession, clock }
}
