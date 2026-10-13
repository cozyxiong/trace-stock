import { useState } from 'react'
import { agentView, demoScoreNotice, type AgentView, type Claim } from '../domain/analysis'
import type { SessionQuote } from '../domain/circleDemo'
import { eventById } from '../domain/events'

export function AgentPanel({
  session,
  onOpenClaim,
}: {
  session: SessionQuote
  onOpenClaim: (claim: Claim, eventId?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const view = agentView(session)

  return (
    <div className="agent-dock">
      {open ? (
        <aside id="agent-panel" className="agent" aria-label="Agent">
          <div className="agent-head">
            <h2>{panelTitle(session, view)}</h2>
          </div>
          <div className="agent-body">
            {view.kind === 'analysis' ? (
              view.claims.length === 0 ? (
                <p className="agent-warn">现有证据不足以判断主要驱动因素</p>
              ) : (
                <>
                  <p className="agent-notice">{demoScoreNotice}</p>
                  {view.insufficient ? <p className="agent-warn">现有证据不足以判断主要驱动因素</p> : null}
                  <ol className="agent-cards">
                    {view.claims.map((claim, index) => (
                      <li key={claim.id}>
                        <article className="agent-card">
                          <h3>
                            <span className="agent-index">{index + 1}.</span>
                            {claim.title}
                          </h3>
                          <div className="agent-links">
                            {claim.eventIds.map((id) => {
                              const cited = eventById(id)
                              if (!cited) return null
                              return (
                                <button key={id} type="button" onClick={() => onOpenClaim(claim, cited.id)}>
                                  {cited.title}
                                </button>
                              )
                            })}
                          </div>
                          <dl>
                            <div>
                              <dt>结论</dt>
                              <dd>{claim.conclusion}</dd>
                            </div>
                            <div className="agent-score">
                              <dt>置信度</dt>
                              <dd>{claim.confidence.toFixed(2)}</dd>
                              <span className={`class-chip ${chipTone(claim.classification)}`}>{claim.classification}</span>
                            </div>
                            <div>
                              <dt>分析依据</dt>
                              <dd>
                                <p>{claim.evidence}</p>
                                <p>{claim.reasoning}</p>
                              </dd>
                            </div>
                            <div>
                              <dt>不确定性</dt>
                              <dd>
                                <p>{claim.uncertainty}</p>
                                <p>{claim.otherExplanations}</p>
                              </dd>
                            </div>
                          </dl>
                        </article>
                      </li>
                    ))}
                  </ol>
                </>
              )
            ) : (
              <p className="agent-message">{view.message}</p>
            )}
          </div>
        </aside>
      ) : null}
      <button
        type="button"
        className="agent-fab"
        aria-expanded={open}
        aria-controls="agent-panel"
        aria-label={open ? '关闭 Agent' : '打开 Agent'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="agent-fab-glyph" aria-hidden="true" />
      </button>
    </div>
  )
}

function panelTitle(session: SessionQuote, view: AgentView): string {
  if (view.kind === 'analysis' && !view.insufficient) return `当前异动日 ${session.tradeDate} · 分析已同步`
  if (view.kind === 'analysis' || view.kind === 'empty') return `当前异动日 ${session.tradeDate}`
  return `所选日 ${session.tradeDate}`
}

function chipTone(classification: Claim['classification']): string {
  if (classification === '因果假设') return 'causal'
  if (classification === '事实') return 'fact'
  if (classification === '观点') return 'opinion'
  return 'temporal'
}
