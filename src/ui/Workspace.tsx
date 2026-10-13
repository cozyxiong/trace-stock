import { useCallback, useEffect, useRef, useState } from 'react'
import { claimById, type Claim } from '../domain/analysis'
import {
  circleDemo,
  COMPANY,
  AS_OF_TRADE_DATE,
  CURRENCY,
  DEFAULT_TRADE_DATE,
  EXCHANGE,
  FIRST_TRADE_DATE,
  sessionButtonLabel,
  sessionByDate,
  SYMBOL,
  type SessionQuote,
} from '../domain/circleDemo'
import { eventById, eventsForSelection } from '../domain/events'
import { AgentPanel } from './AgentPanel'
import { CandleChart } from './CandleChart'
import { EventRail } from './EventPanels'
import { formatCompactVolume, formatPercent, formatPrice, formatVolume } from './format'

const INTERVALS = ['分时', '1分', '15分', '1小时'] as const

export function Workspace() {
  const [ready, setReady] = useState(false)
  const [selectedDate, setSelectedDate] = useState(DEFAULT_TRADE_DATE)
  const [eventId, setEventId] = useState<string | null>(null)
  const [claimId, setClaimId] = useState<string | null>(null)
  const [timelinePin, setTimelinePin] = useState(0)
  const selected = sessionByDate(selectedDate)
  const claim = claimId ? claimById(claimId) ?? null : null

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 50)
    return () => window.clearTimeout(timer)
  }, [])

  const selectDate = useCallback((tradeDate: string) => {
    if (!sessionByDate(tradeDate)) return
    setSelectedDate(tradeDate)
    setEventId(null)
    setClaimId(null)
    setTimelinePin((value) => value + 1)
  }, [])

  const openEvent = useCallback((nextEventId: string) => {
    setEventId(nextEventId)
    setClaimId(null)
  }, [])

  const openClaim = useCallback((nextClaim: Claim, eventId?: string) => {
    setClaimId(nextClaim.id)
    setEventId(eventId ?? nextClaim.eventIds[0] ?? null)
  }, [])

  const closeEvent = useCallback(() => {
    setEventId(null)
  }, [])

  return (
    <div className="workspace">
      <p className="demo-banner" role="note">
        行情为 CRCL 公开日线，自 {FIRST_TRADE_DATE} 起，不含上市当日，截至 {AS_OF_TRADE_DATE}。事件摘自公开报道，不是对涨跌的已证实解释。
      </p>
      <main className="stage">
        {ready && selected ? (
          <WorkspaceBody
            selected={selected}
            eventId={eventId}
            claim={claim}
            onSelect={selectDate}
            timelinePin={timelinePin}
            onOpenEvent={openEvent}
            onOpenClaim={openClaim}
            onCloseEvent={closeEvent}
          />
        ) : (
          <p className="loading" role="status">
            正在打开本地行情
          </p>
        )}
      </main>
    </div>
  )
}

function toneOf(session: SessionQuote): 'up' | 'down' | 'flat' {
  if (session.invalid || session.changePercent === null || session.changePercent === 0) return 'flat'
  return session.changePercent > 0 ? 'up' : 'down'
}

function QuoteHeader({ session }: { session: SessionQuote }) {
  const tone = toneOf(session)

  return (
    <header className="topbar" role="banner">
      <div className="ticker-row">
        <div className="identity">
          <span className="mark" aria-hidden="true">
            C
          </span>
          <div>
            <h1>{COMPANY}</h1>
            <p className="meta">
              <span>{SYMBOL}</span>
              <span>{EXCHANGE}</span>
              <span>{CURRENCY}</span>
            </p>
          </div>
        </div>
        {session.invalid ? null : (
          <dl className={`quote-figures ${tone}`}>
            <div className="last-price">
              <dt>收盘</dt>
              <dd>{formatPrice(session.close)}</dd>
            </div>
            <div className="last-meta">
              <div>
                <dt>涨跌幅</dt>
                <dd>{formatPercent(session.changePercent)}</dd>
              </div>
              {session.anomaly && session.direction && session.severity ? (
                <div>
                  <dt>异动</dt>
                  <dd>
                    {session.direction} · {session.severity}
                  </dd>
                </div>
              ) : null}
            </div>
          </dl>
        )}
        <div className="chart-toolbar" role="toolbar" aria-label="周期">
          <button type="button" aria-pressed="true">
            日K
          </button>
          {INTERVALS.map((interval) => (
            <button key={interval} type="button" disabled>
              {interval}
            </button>
          ))}
        </div>
      </div>
      {session.invalid ? null : (
        <div className={`ohlc-line ${tone}`}>
          <time dateTime={session.tradeDate}>{session.tradeDate}</time>
          <div>
            <dt>开盘</dt>
            <dd>{formatPrice(session.open)}</dd>
          </div>
          <div>
            <dt>最高</dt>
            <dd>{formatPrice(session.high)}</dd>
          </div>
          <div>
            <dt>最低</dt>
            <dd>{formatPrice(session.low)}</dd>
          </div>
          <div>
            <dt>成交量</dt>
            <dd>{formatVolume(session.volume)}</dd>
          </div>
        </div>
      )}
      {session.invalid ? (
        <p className="invalid-note" role="alert">
          数据异常。{session.tradeDate} 的{session.problems.join('，')}
          。这条行情不画成 K 线，不参与异动判定，也不作为后一交易日的前收盘价。异常值：开盘{' '}
          {formatPrice(session.open)}，最高 {formatPrice(session.high)}，最低 {formatPrice(session.low)}
          ，收盘 {formatPrice(session.close)}，成交量 {formatVolume(session.volume)}。
        </p>
      ) : null}
      {session.reason ? <p className="anomaly-reason">{session.reason}</p> : null}
    </header>
  )
}

function WorkspaceBody({
  selected,
  eventId,
  claim,
  onSelect,
  timelinePin,
  onOpenEvent,
  onOpenClaim,
  onCloseEvent,
}: {
  selected: SessionQuote
  eventId: string | null
  claim: Claim | null
  onSelect: (tradeDate: string) => void
  timelinePin: number
  onOpenEvent: (eventId: string) => void
  onOpenClaim: (claim: Claim, eventId?: string) => void
  onCloseEvent: () => void
}) {
  const { windowEvents, unmapped } = eventsForSelection(selected)
  const event = eventId ? eventById(eventId) ?? null : null
  const dateStripRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const button = dateStripRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
    button?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [selected.tradeDate])

  const tone = toneOf(selected)

  return (
    <div className="workspace-row">
      <div className="chart-column">
        <QuoteHeader session={selected} />
        <section className="chart-pane" aria-label="日 K 线">
          <CandleChart bars={circleDemo.chartBars} selectedDate={selected.tradeDate} onSelect={onSelect} />
          {selected.invalid ? null : (
            <p className={`volume-legend ${tone}`}>
              <span>VOLUME</span>
              <strong>{formatCompactVolume(selected.volume)}</strong>
            </p>
          )}
          <AgentPanel session={selected} onOpenClaim={onOpenClaim} />
        </section>
        <nav className="date-strip" aria-label="交易日" ref={dateStripRef}>
          {circleDemo.sessions.map((session) => {
            const label = sessionButtonLabel(session)
            const selectedDay = session.tradeDate === selected.tradeDate
            const names = [
              session.anomaly ? 'anomaly' : '',
              session.invalid ? 'invalid' : '',
              (session.changePercent ?? 0) > 0 ? 'up' : (session.changePercent ?? 0) < 0 ? 'down' : '',
            ].filter(Boolean)
            return (
              <button
                key={session.tradeDate}
                type="button"
                aria-pressed={selectedDay}
                aria-label={label}
                className={names.length ? names.join(' ') : undefined}
                onClick={() => onSelect(session.tradeDate)}
              >
                {label}
              </button>
            )
          })}
        </nav>
      </div>
      <EventRail
        session={selected}
        windowEvents={windowEvents}
        unmapped={unmapped}
        event={event}
        claim={claim && event && claim.eventIds.includes(event.id) ? claim : null}
        citedIds={claim?.eventIds ?? []}
        pinned={timelinePin}
        onOpen={onOpenEvent}
        onClose={onCloseEvent}
      />
    </div>
  )
}
