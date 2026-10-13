import type { SessionQuote } from './circleDemo'
import { eventById, type MappedEvent } from './events'

export type Classification = '事实' | '观点' | '时间相关性' | '因果假设'

export type Claim = {
  id: string
  title: string
  conclusion: string
  eventIds: string[]
  evidence: string
  reasoning: string
  classification: Classification
  confidence: number
  uncertainty: string
  otherExplanations: string
}

type PresetDay = {
  tradeDate: string
  claims: Claim[]
  insufficient: boolean
}

const PRESETS: PresetDay[] = [
  {
    tradeDate: '2025-06-18',
    insufficient: false,
    claims: [
      {
        id: 'genius-hypothesis',
        title: '前一晚的 GENIUS 表决',
        conclusion:
          '参议院在前一交易日收盘后通过 GENIUS 法案，可能是 2025-06-18 上涨的影响因素之一。这是假设，不是确定原因。',
        eventIds: ['genius-senate'],
        evidence: '参议院每日新闻稿把 68 对 30 的表决记在 2025-06-17 下午 5:46（华盛顿）。',
        reasoning:
          '表决晚于纽约时间 16:00，映射到下一交易日。稳定币发行方会直接受到这类联邦框架的影响，所以有一条从法案到预期的推理链。法案当时还没有经众议院和总统签署。',
        classification: '因果假设',
        confidence: 0.42,
        uncertainty: '没有委托流可以证明买单来自这条新闻，也没有把 Circle 和其他加密资产股票分开。',
        otherExplanations: '同一时期的行业情绪、流动性和未收录信息也可以走出同样的 K 线。',
      },
    ],
  },
  {
    tradeDate: '2026-02-25',
    insufficient: false,
    claims: [
      {
        id: 'earnings-fact',
        title: '第四季业绩已经公布',
        conclusion:
          'Circle 在 2026-02-25 开盘前公布了第四季收入及储备金收入、调整后 EBITDA 和 USDC 流通量。这是发布记录，不是对涨幅的解释。',
        eventIds: ['q4-results'],
        evidence:
          '公司新闻稿给出 7.70 亿美元、1.67 亿美元和 753 亿美元。电话会定在上午 8:00（美东）。',
        reasoning: '这些数字写在公司自己的披露里，所以“已经公布”只是对披露的复述。',
        classification: '事实',
        confidence: 0.92,
        uncertainty: '08:00 是电话会时间。业绩稿的精确分钟没有单独记录。',
        otherExplanations: '披露本身不说明市场如何交易它。',
      },
      {
        id: 'earnings-hypothesis',
        title: '开盘前业绩与当日大涨',
        conclusion:
          '开盘前的第四季业绩可能是 2026-02-25 上涨的影响因素之一。这是假设，不是确定原因。',
        eventIds: ['q4-results'],
        evidence: '业绩稿在电话会之前已经发布，电话会开始于开盘前的 8:00（美东）。',
        reasoning:
          '收入、利润和 USDC 流通量都高于公司给出的上年同期。交易员在开盘前可以看到这些数字，所以存在一条从披露到预期的推理链。',
        classification: '因果假设',
        confidence: 0.44,
        uncertainty: '各家对一致预期的数字不一致，本页没有选用其中某一个当作基准。',
        otherExplanations: '当天加密资产价格也有明显波动。业绩以外的仓位和流动性同样可以造成这次跳动。',
      },
    ],
  },
  {
    tradeDate: '2026-03-24',
    insufficient: false,
    claims: [
      {
        id: 'yield-hypothesis',
        title: '稳定币收益草案',
        conclusion:
          '交易时段内关于 CLARITY 草案收紧稳定币收益的报道，可能是 2026-03-24 下跌的影响因素之一。这是假设，不是确定原因。',
        eventIds: ['clarity-yield'],
        evidence:
          'Seeking Alpha 在 11:47 a.m. ET 报道草案会限制类似存款利息的奖励。Coinbase 被同时写进下跌的股票里。',
        reasoning:
          'Circle 的收入大量来自储备资产收益，分销平台上的奖励又关系到 USDC 的持有需求。草案若收紧这类奖励，会改变对这部分收入的预期。报道出现在交易时段。',
        classification: '因果假设',
        confidence: 0.48,
        uncertainty: '草案尚未立法，午盘跌幅也不是收盘价。无法确认卖单有多少来自这条消息。',
        otherExplanations:
          '次日有分析师认为反应过大，甚至可能改变 Circle 与 Coinbase 的分成谈判。那是事后评论，不是当天已经发生的事实。',
      },
    ],
  },
  {
    tradeDate: '2026-06-30',
    insufficient: false,
    claims: [
      {
        id: 'ousd-hypothesis',
        title: 'Open USD 公布',
        conclusion:
          'Open Standard 公布 Open USD，可能是 2026-06-30 下跌的影响因素之一。这是假设，不是确定原因。',
        eventIds: ['ousd-launch'],
        evidence:
          'The Block 在下午 3:34（美东）报道，超过 140 家机构支持这一新稳定币，名单包括 Visa、Stripe、Mastercard、BlackRock 和 Coinbase。',
        reasoning:
          '竞争者若分流 USDC 的流通和储备收益，会压低对 Circle 收入的预期。消息出现在下跌当天的交易时段，所以存在一条从竞争到预期的推理链。',
        classification: '因果假设',
        confidence: 0.4,
        uncertainty: 'William Blair 当天就认为竞争担忧被夸大。两种说法不能同时被本页证实。',
        otherExplanations: '分析师维持跑赢评级。内部人减持或指数调整若未被本页单独核实，就不写进来。',
      },
    ],
  },
  {
    tradeDate: '2026-09-03',
    insufficient: true,
    claims: [
      {
        id: 'sep3-context',
        title: '证词与板块上涨叠在一起',
        conclusion:
          '前一日证词和当天的板块上涨都被报道提到。现有材料没有把其中一项单独证明为主要驱动。',
        eventIds: ['tarbert-testimony', 'sep3-coverage'],
        evidence:
          '证词记在 2026-09-02。24/7 Wall St. 在 2026-09-03 11:30（美东）把上涨和证词放在一起。TIKR 事后还写到 Coinbase 等同日上涨，以及偏鸽的美联储评论。',
        reasoning:
          '证词映射在异动前一个交易日，当天报道映射在异动当日。时间上可以并列，但证词当日本身不是异动，板块上涨又提供了另一条叙述。',
        classification: '时间相关性',
        confidence: 0.32,
        uncertainty: '缺少能把证词、板块和个股买单分开的证据。',
        otherExplanations: '次日复盘把涨幅同时归因于更广的加密资产上涨。那篇文章不能倒推成当天已经公开的单一原因。',
      },
    ],
  },
  {
    tradeDate: '2026-09-15',
    insufficient: false,
    claims: [
      {
        id: 'clarity-hypothesis',
        title: 'CLARITY 未获推进',
        conclusion:
          '参议院程序性表决没有达到 60 票，可能是 2026-09-15 下跌的影响因素之一。这是假设，不是确定原因。',
        eventIds: ['clarity-vote'],
        evidence:
          'CNBC 在美东 15:05 报道表决未达到推进所需的 60 票，并写道 Circle 与 Coinbase 同日下跌。',
        reasoning:
          'CLARITY 若推进，会改变数字资产市场结构的预期。表决发生在交易时段，报道又把 Circle 的下跌和结果放在一起，所以存在一条从立法受阻到预期的推理链。',
        classification: '因果假设',
        confidence: 0.46,
        uncertainty: '票数的书写顺序在不同报道里不一致。比特币当天也下跌，幅度各篇不同，本页不采用其中某一个。',
        otherExplanations: '同日其他加密资产股票也下跌。未能分开的板块卖盘可以走出同样的 K 线。',
      },
      {
        id: 'clarity-next-day-only',
        title: '仅引用次日复述',
        conclusion: '次日复述可能已经是 2026-09-15 下跌的确定原因。',
        eventIds: ['clarity-vote-recap'],
        evidence: 'FXStreet 的文章发布于 2026-09-16 早晨。',
        reasoning: '这条结论只引用了映射在异动日之后的复述，用来确认页面不会展示它。',
        classification: '因果假设',
        confidence: 0.55,
        uncertainty: '复述发生在收盘之后。',
        otherExplanations: '当天已经有表决报道。',
      },
    ],
  },
  {
    tradeDate: '2026-09-16',
    insufficient: true,
    claims: [
      {
        id: 'arc-fact',
        title: 'Arc 主网已宣布上线',
        conclusion: 'Circle 将 Arc 公开主网的日期写为 2026-09-16。这是发布记录，不是对下跌的解释。',
        eventIds: ['arc-mainnet'],
        evidence: '公司新闻稿的日期是 2026-09-16。The Block 在当天 6:30 a.m. EDT 报道主网开放。',
        reasoning: '上线写在公司公告和当天的报道里，所以“已经宣布”只是对发布记录的复述。',
        classification: '事实',
        confidence: 0.9,
        uncertainty: '新闻稿没有单独给出分钟。6:30 是 The Block 的署名时间。',
        otherExplanations: '产品发布常常被说成利好，不能直接拿来解释下跌。',
      },
      {
        id: 'arc-timing',
        title: '上线与下跌同一天',
        conclusion: '主网上线和 2026-09-16 的下跌落在同一天。时间接近不能说明上线造成了下跌。',
        eventIds: ['arc-mainnet'],
        evidence: '上线报道映射在 2026-09-16。前一交易日的 CLARITY 表决也在时间线窗口里。',
        reasoning: '同一映射日只说明两件事被归到同一交易日。没有经营或委托数据把主网上线连到这次下跌。',
        classification: '时间相关性',
        confidence: 0.22,
        uncertainty: '前一日立法表决后的延续卖盘是另一条现成叙述。',
        otherExplanations:
          '随后有分析师把 Arc 附近的压力描述成卖事实。那是事后评论，本页不把它当成已经证实的原因。',
      },
    ],
  },
]

function citedEvents(claim: Claim): MappedEvent[] {
  return claim.eventIds.map((id) => {
    const event = eventById(id)
    if (!event) throw new Error(`结论引用了不存在的事件 ${id}`)
    return event
  })
}

/** Drop a causal claim that only cites events mapped after the anomaly and is too confident. */
export function claimsForDisplay(tradeDate: string, claims: Claim[]): Claim[] {
  return claims.filter((claim) => {
    if (claim.classification !== '因果假设' || claim.confidence <= 0.35) return true
    const cited = citedEvents(claim)
    const onlyAfter =
      cited.length > 0 && cited.every((event) => event.mappedTradeDate !== null && event.mappedTradeDate > tradeDate)
    return !onlyAfter
  })
}

for (const preset of PRESETS) {
  claimsForDisplay(preset.tradeDate, preset.claims)
}

export type AgentView =
  | { kind: 'invalid'; message: string }
  | { kind: 'quiet'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'analysis'; claims: Claim[]; insufficient: boolean }

const SCORE_NOTICE = '分数根据公开报道整理，不是统计概率。'

export function agentView(session: SessionQuote): AgentView {
  if (session.invalid) {
    return { kind: 'invalid', message: '这条行情不合法，不解释涨跌原因。' }
  }
  if (!session.anomaly) {
    return { kind: 'quiet', message: '该日不符合异动规则，不给出驱动因素。' }
  }
  const preset = PRESETS.find((item) => item.tradeDate === session.tradeDate)
  if (!preset || preset.claims.length === 0) {
    return { kind: 'empty', message: '当前日期没有预设分析结果。' }
  }
  const claims = featuredClaims(claimsForDisplay(session.tradeDate, preset.claims))
  if (claims.length === 0) {
    return { kind: 'analysis', claims: [], insufficient: true }
  }
  const insufficient = claims.every((claim) => claim.classification !== '因果假设')
  return { kind: 'analysis', claims, insufficient }
}

/** Prefer causal hypotheses. Otherwise keep the strongest remaining claims. At most three. */
function featuredClaims(claims: Claim[]): Claim[] {
  const byConfidence = (left: Claim, right: Claim) => right.confidence - left.confidence
  const causal = claims.filter((claim) => claim.classification === '因果假设').sort(byConfidence)
  const pool = causal.length > 0 ? causal : [...claims].sort(byConfidence)
  return pool.slice(0, 3)
}

export function claimById(id: string): Claim | undefined {
  return PRESETS.flatMap((preset) => preset.claims).find((claim) => claim.id === id)
}

export const demoScoreNotice = SCORE_NOTICE
