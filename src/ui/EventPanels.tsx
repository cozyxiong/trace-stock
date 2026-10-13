import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { demoScoreNotice, type Claim } from '../domain/analysis'
import type { SessionQuote } from '../domain/circleDemo'
import { correlationFor, type MappedEvent, type TimelineEntry } from '../domain/events'

type EventFilter = 'all' | '公告' | '新闻' | '财务'

const FILTERS: { id: EventFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: '公告', label: '公告' },
  { id: '新闻', label: '新闻' },
  { id: '财务', label: '财务' },
]

export function EventRail({
  session,
  windowEvents,
  unmapped,
  event,
  claim,
  citedIds,
  pinned,
  onOpen,
  onClose,
}: {
  session: SessionQuote
  windowEvents: TimelineEntry[]
  unmapped: MappedEvent[]
  event: MappedEvent | null
  claim: Claim | null
  citedIds: string[]
  pinned: number
  onOpen: (eventId: string) => void
  onClose: () => void
}) {
  const [open, setOpen] = useState(true)
  const [filter, setFilter] = useState<EventFilter>('all')
  const [filterDate, setFilterDate] = useState(session.tradeDate)
  if (filterDate !== session.tradeDate) {
    setFilterDate(session.tradeDate)
    setFilter('all')
  }

  const visible = windowEvents.filter((item) => matchesFilter(item.type, filter))
  const timelineRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setOpen(true)
  }, [pinned])

  useEffect(() => {
    const root = timelineRef.current
    if (!root) return
    const current = root.querySelector<HTMLElement>('[data-day="current"]')
    if (current) current.scrollIntoView?.({ block: 'center', inline: 'nearest' })
    else root.scrollTop = 0
  }, [session.tradeDate, open])

  return (
    <div className={open ? 'side-column' : 'side-column collapsed'}>
      <div className="side-head">
        <button
          type="button"
          className="side-toggle"
          aria-expanded={open}
          aria-label={open ? '收起侧边栏' : '打开侧边栏'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '‹‹' : '››'}
        </button>
      </div>
      {open ? (
        <aside className="timeline" aria-label="事件时间线" ref={timelineRef}>
          <div className="timeline-tools">
            <div className="filter-row" role="toolbar" aria-label="事件类型">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="day-hint">
              <span className={session.anomaly ? 'day-chip anomaly' : 'day-chip'}>
                {session.anomaly ? '异动日' : '所选日'}
              </span>
              <time dateTime={session.tradeDate}>{session.tradeDate}</time>
              <span className="day-count">{visible.length}</span>
            </p>
          </div>
          {windowEvents.length === 0 ? (
            <p className="timeline-empty">暂无相关事件</p>
          ) : visible.length === 0 ? (
            <p className="timeline-empty">当前筛选下暂无事件</p>
          ) : (
            <ol className="event-list">
              {visible.map((item) => (
                <li key={item.id} data-day={item.timeAssociated ? 'current' : undefined}>
                  <span className={`event-dot ${relationTone(item.position)}`} aria-hidden="true" />
                  <EventCard
                    event={item}
                    position={item.position}
                    timeAssociated={item.timeAssociated}
                    open={event?.id === item.id}
                    cited={citedIds.includes(item.id)}
                    onOpen={onOpen}
                  />
                </li>
              ))}
            </ol>
          )}
          <section className="unmapped" aria-label="未能映射">
            {unmapped.length === 0 ? (
              <h2 className="sr-only">未能映射</h2>
            ) : (
              <>
                <h2>未能映射</h2>
                <ol className="event-list">
                  {unmapped.map((item) => (
                    <li key={item.id}>
                      <span className="event-dot after" aria-hidden="true" />
                      <EventCard
                        event={item}
                        position="超出数据范围"
                        timeAssociated={false}
                        open={event?.id === item.id}
                        cited={citedIds.includes(item.id)}
                        onOpen={onOpen}
                      />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </aside>
      ) : null}
      {open && !event ? (
        <section className="detail-hint" aria-label="事件详情">
          <p>选择时间线上的事件以查看详情</p>
        </section>
      ) : null}
      {open && event ? (
        <div className="drawer-layer">
          <button type="button" className="drawer-mask" aria-label="关闭事件详情" onClick={onClose} />
          <EventDrawer event={event} claim={claim} onClose={onClose} />
        </div>
      ) : null}
    </div>
  )
}

function matchesFilter(type: MappedEvent['type'], filter: EventFilter): boolean {
  if (filter === 'all') return true
  if (filter === '财务') return type === '财务数据'
  return type === filter
}

function relationTone(position: string): 'before' | 'during' | 'after' {
  if (position.endsWith('前')) return 'before'
  if (position.endsWith('后')) return 'after'
  return 'during'
}

function displayType(type: MappedEvent['type']): string {
  if (type === '财务数据') return '财务'
  return type
}

function Stamp({ value }: { value: string }) {
  const matched = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})\s*(.*)$/.exec(value)
  if (!matched) return <>{value}</>
  return (
    <>
      <span className="sr-only">{value}</span>
      <span className="stamp-date">{matched[1]}</span> <span className="stamp-clock">{matched[2]}</span>
      {matched[3] ? <> <span className="stamp-offset">{matched[3]}</span></> : null}
    </>
  )
}

function cardClock(event: MappedEvent): string {
  const matched = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(event.exchangeTime)
  const when = matched ? `${matched[2]}-${matched[3]} ${matched[4]}:${matched[5]}` : event.exchangeTime
  return `${when} · ${event.sourceType}`
}

function eventName(
  event: MappedEvent,
  position: string,
  timeAssociated: boolean,
  cited: boolean,
): string {
  const association = timeAssociated ? ' 时间关联' : ''
  const base = `${event.title} ${event.type} ${position}${association}`
  return cited ? `${base} 已引用` : base
}

function EventCard({
  event,
  position,
  timeAssociated,
  open,
  cited,
  onOpen,
}: {
  event: MappedEvent
  position: string
  timeAssociated: boolean
  open: boolean
  cited: boolean
  onOpen: (eventId: string) => void
}) {
  const tone = relationTone(position)
  return (
    <button
      type="button"
      className={`event-card ${tone}`}
      aria-pressed={open}
      aria-label={eventName(event, position, timeAssociated, cited)}
      onClick={() => onOpen(event.id)}
    >
      <span className="card-chips">
        <span className={`rel-chip ${tone}`}>{position}</span>
        {timeAssociated ? <span className="rel-chip associated">时间关联</span> : null}
        {cited ? <span className="rel-chip cited">已引用</span> : null}
      </span>
      <span className="card-time">{cardClock(event)}</span>
      <span className="card-title">{event.title}</span>
    </button>
  )
}

function judgmentTone(label: string): string {
  if (label === '因果假设') return 'causal'
  if (label === '事实') return 'fact'
  if (label === '观点') return 'opinion'
  return 'temporal'
}

function alertLead(judgment: string): string {
  if (judgment === '因果假设') return '因果假设：尚未证实为原因。'
  if (judgment === '事实') return '事实：这是记录，不是对涨跌的解释。'
  if (judgment === '观点') return '观点：这是看法，不是已证实原因。'
  return '时间相关性：时间接近并不构成因果。'
}

function sourceCompany(source: string): string {
  const head = source.split(/[；;，,]/)[0].trim()
  return head.replace(/(?:每日新闻稿|新闻稿|投资者关系|博客.*)$/, '').trim()
}

function ExternalLinkIcon() {
  return (
    <svg className="evidence-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.2 3.2H3.6A1.4 1.4 0 0 0 2.2 4.6v7.8A1.4 1.4 0 0 0 3.6 13.8h7.8a1.4 1.4 0 0 0 1.4-1.4V9.8M8.4 7.6 13.6 2.4M9.4 2.2h4.4v4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="judge-alert-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 2.4 1.7 17.2h16.6L10 2.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 7.4v4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14.3" r="0.8" fill="currentColor" />
    </svg>
  )
}

function fitEvidenceTitle(node: HTMLElement) {
  const min = 8
  let size = 14
  node.style.fontSize = `${size}px`
  while (size > min && node.scrollWidth > node.clientWidth + 0.5) {
    size = Math.round((size - 0.5) * 10) / 10
    node.style.fontSize = `${size}px`
  }
}

function EvidenceTitle({ source }: { source: string }) {
  const titleRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const node = titleRef.current
    if (!node) return
    fitEvidenceTitle(node)
    if (typeof ResizeObserver === 'undefined' || !node.parentElement) return
    const observer = new ResizeObserver(() => fitEvidenceTitle(node))
    observer.observe(node.parentElement)
    return () => observer.disconnect()
  }, [source])

  return (
    <span ref={titleRef} className="evidence-title">
      {source}
    </span>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function InfoStack({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="info-stack">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function EventDrawer({
  event,
  claim,
  onClose,
}: {
  event: MappedEvent
  claim: Claim | null
  onClose: () => void
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryOverflow, setSummaryOverflow] = useState(false)
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const correlation = correlationFor(event)
  const judgment = claim?.classification ?? correlation.judgment

  useEffect(() => {
    setEvidenceOpen(false)
    setSummaryOpen(false)
  }, [event.id])

  useLayoutEffect(() => {
    const node = summaryRef.current
    if (!node || summaryOpen) return
    const previous = node.className
    node.className = 'drawer-summary is-clamped'
    const overflows = node.scrollHeight > node.clientHeight + 1
    node.className = previous
    setSummaryOverflow(overflows)
  }, [event.id, event.summary, summaryOpen])

  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return
      keyEvent.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <section className="drawer" aria-label="事件详情">
      <header className="drawer-head">
        <p className="drawer-kicker">事件详情 · {displayType(event.type)}</p>
        <button type="button" className="drawer-close" aria-label="关闭详情" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="drawer-body">
        <section className="drawer-hero" aria-label="标题">
          <h2>{event.title}</h2>
        </section>
        <section className="drawer-lead" aria-label="摘要">
          <p ref={summaryRef} className={summaryOverflow && !summaryOpen ? 'drawer-summary is-clamped' : 'drawer-summary'}>
            {event.summary}
          </p>
          {summaryOverflow ? (
            <button
              type="button"
              className="summary-toggle"
              aria-expanded={summaryOpen}
              onClick={() => setSummaryOpen((value) => !value)}
            >
              {summaryOpen ? '收起' : '展开'}
              <span className="chevron" aria-hidden="true" />
            </button>
          ) : null}
        </section>
        <div className="info-list">
          <section aria-label="来源">
            <InfoRow label="来源">
              <span className="source-line">
                <span className="source-name">{sourceCompany(event.source)}</span>
                <span className="source-type">{event.sourceType}</span>
              </span>
            </InfoRow>
          </section>
          <section aria-label="发布时间">
            <InfoRow label="发布时间">
              <Stamp value={event.exchangeTime} />
            </InfoRow>
          </section>
          <section aria-label="相关证据">
            <p className="evidence-label">相关证据</p>
            <div className="evidence-item">
              <dt className="sr-only">证据</dt>
              <button
                type="button"
                className="evidence-link"
                aria-pressed={evidenceOpen}
                onClick={() => setEvidenceOpen((value) => !value)}
              >
                <ExternalLinkIcon />
                <EvidenceTitle source={event.source} />
              </button>
              <p className="evidence-note">{event.evidence}</p>
            </div>
          </section>
          <section aria-label="相关性判断">
            <InfoRow label="相关性判断">
              <span className={`class-chip ${judgmentTone(judgment)}`}>{judgment}</span>
            </InfoRow>
            <div className="judge-alert">
              <AlertIcon />
              <p>
                <span className="judge-alert-lead">{alertLead(judgment)}</span>
              </p>
            </div>
            {claim ? <p className="info-prose">{claim.conclusion}</p> : null}
            {claim?.classification === '因果假设' ? (
              <>
                <InfoStack label="依据">
                  <p>{claim.evidence}</p>
                  <p>{claim.reasoning}</p>
                </InfoStack>
                <InfoRow label="置信度">
                  <span className="score-value">{claim.confidence.toFixed(2)}</span>
                </InfoRow>
                <p className="score-note">{demoScoreNotice}</p>
                <InfoStack label="不确定性">
                  <p>{claim.uncertainty}</p>
                  <p>{claim.otherExplanations}</p>
                </InfoStack>
              </>
            ) : claim ? (
              <>
                <InfoStack label="依据">
                  <p>{claim.reasoning}</p>
                </InfoStack>
                <InfoStack label="不确定性">
                  <p>{claim.uncertainty}</p>
                </InfoStack>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  )
}
