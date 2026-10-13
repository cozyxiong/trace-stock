import { sessionByDate, tradingSessions, type SessionQuote } from './circleDemo'
import { mapPublishedAt } from './timeMapping'

export type EventType = '公告' | '新闻' | '行业事件' | '财务数据'

export type DemoEvent = {
  id: string
  title: string
  type: EventType
  publishedAt: string
  summary: string
  source: string
  sourceType: string
  evidence: string
  relatedSymbols: ['CRCL']
  tags: string[]
}

export type MappedEvent = DemoEvent & {
  exchangeTime: string
  offset: string
  mappedTradeDate: string | null
  outOfRangeReason: string | null
}

const TIME_LIMIT =
  '映射到相近交易日只说明发布时间落在哪个交易日，不能据此认定它造成了股价变动。'
const RANGE_LIMIT =
  '这条记录的纽约时间不能落到当前行情里的交易日，不能当成某次异动的原因。'

const RAW_EVENTS: DemoEvent[] = [
  {
    id: 'genius-senate',
    title: '参议院通过 GENIUS 稳定币法案',
    type: '公告',
    publishedAt: '2025-06-17T17:46:00-04:00',
    summary:
      '美国参议院在 2025-06-17 以 68 票对 30 票通过 S.1582（GENIUS 法案）。当晚法案尚未成为法律，仍需众议院审议和总统签署。',
    source: '美国参议院每日新闻稿',
    sourceType: '官方记录',
    evidence:
      '参议院每日新闻稿把表决结果记在 2025-06-17 下午 5:46（华盛顿）。该时刻晚于纽约时间 16:00。',
    relatedSymbols: ['CRCL'],
    tags: ['立法', '稳定币'],
  },
  {
    id: 'q4-results',
    title: 'Circle 公布第四季业绩',
    type: '财务数据',
    publishedAt: '2026-02-25T08:00:00-05:00',
    summary:
      'Circle 公布 2025 年第四季业绩：收入及储备金收入 7.70 亿美元，按年增加 77%；调整后 EBITDA 1.67 亿美元；年末 USDC 流通量 753 亿美元，按年增加 72%。公司将电话会定在当天上午 8:00（美东），并说明业绩稿已于当天早些时候发布。',
    source: 'Circle 投资者关系；业绩电话会实录',
    sourceType: '公司公告',
    evidence:
      '新闻稿日期是 2026-02-25。电话会实录写明会议时间为当天上午 8:00（美东），业绩稿在会议前已经公布。08:00 是电话会时间，不是业绩稿的精确分钟。公开报道对市场一致预期的数字并不一致，这里不采用其中某一家的预期值。',
    relatedSymbols: ['CRCL'],
    tags: ['业绩'],
  },
  {
    id: 'clarity-yield',
    title: '报道称 CLARITY 草案收紧稳定币收益',
    type: '新闻',
    publishedAt: '2026-03-24T11:47:00-04:00',
    summary:
      'Seeking Alpha 报道，最新 CLARITY 草案据称会把稳定币奖励限制在较窄范围：与持有余额、并且类似银行存款利息的安排受限制，与用户活动相关的奖励仍可能保留。报道称 Circle 在午盘下跌，Coinbase 也下跌。',
    source: 'Seeking Alpha，Liz Kiesche',
    sourceType: '新闻',
    evidence:
      '文章时间戳为 2026-03-24 11:47 a.m. ET。文中跌幅是午盘观察，不是本页使用的收盘价。草案当时尚未成为法律。',
    relatedSymbols: ['CRCL'],
    tags: ['立法', '稳定币收益'],
  },
  {
    id: 'clarity-yield-recap',
    title: '次日报道复述稳定币收益草案',
    type: '新闻',
    publishedAt: '2026-03-25T11:38:00-04:00',
    summary:
      'CoinDesk 在下一交易日复述前一日的下跌，并引述分析师的看法：限制收益的草案打击了 Circle 和 Coinbase，但有人认为反应过大，发行方的谈判地位未必更差。',
    source: 'CoinDesk，Krisztian Sandor',
    sourceType: '新闻',
    evidence: '文章时间戳为 2026-03-25 11:38 a.m. EDT。它写在 2026-03-24 收盘之后。',
    relatedSymbols: ['CRCL'],
    tags: ['复述'],
  },
  {
    id: 'ousd-launch',
    title: 'Open Standard 公布 Open USD',
    type: '行业事件',
    publishedAt: '2026-06-30T15:34:00-04:00',
    summary:
      'The Block 报道，Open Standard 公布稳定币 Open USD，支持方超过 140 家，包括 Visa、Stripe、Mastercard、BlackRock 和 Coinbase。William Blair 的 Andrew Jeffrey 与 Adib Choudhury 认为竞争担忧被夸大，并维持跑赢评级。',
    source: 'The Block，Kyle Baird',
    sourceType: '新闻',
    evidence:
      'The Block 的署名时间是 2026-06-30 3:34 p.m. EDT。文中“下跌超过 16%”是报道当时的说法。William Blair 的评论是分析师观点。',
    relatedSymbols: ['CRCL'],
    tags: ['竞争', '稳定币'],
  },
  {
    id: 'tarbert-testimony',
    title: 'Heath Tarbert 在众议院作证',
    type: '公告',
    publishedAt: '2026-09-02T12:00:00-04:00',
    summary:
      'Circle 总裁 Heath Tarbert 于 2026-09-02 向众议院金融服务委员会作证，呼吁完整落实 GENIUS 法案，并继续推进 CLARITY 法案。',
    source: 'Circle 博客对书面证词的说明；众议院金融服务委员会听证会',
    sourceType: '公开证词',
    evidence:
      '公开页面把听证和 Circle 当天的博客记在 2026-09-02，没有给出作证的分钟。12:00 只用来把记录放进交易日，不是听证开始时间。',
    relatedSymbols: ['CRCL'],
    tags: ['听证'],
  },
  {
    id: 'sep3-coverage',
    title: '报道将上涨与前一日证词并列',
    type: '新闻',
    publishedAt: '2026-09-03T11:30:00-04:00',
    summary:
      '24/7 Wall St. 在 2026-09-03 交易时段把股价上涨和 Heath Tarbert 的国会证词放在一起。文章里的价格是盘中数字，不是本页收盘价。',
    source: '24/7 Wall St.',
    sourceType: '新闻',
    evidence:
      '页面发布时间对应 2026-09-03 15:30 UTC，即美东 11:30。证词发生在前一个交易日。文章没有把证词和当天更广的加密资产上涨分开。',
    relatedSymbols: ['CRCL'],
    tags: ['盘中报道'],
  },
  {
    id: 'sep3-recap',
    title: '次日文章复盘九月三日收盘',
    type: '新闻',
    publishedAt: '2026-09-04T12:00:00-04:00',
    summary:
      'TIKR 在事后写道，2026-09-03 Circle 收于 103.23 美元，当天涨幅约 16.46%，并重新站上 100 美元。文章同时提到 Coinbase 等数字资产股票上涨，并把背景写成偏鸽的美联储评论和地缘紧张缓和。证词被记在 2026-09-02。',
    source: 'TIKR，Wiltone Asuncion',
    sourceType: '新闻',
    evidence:
      '文章只标明最后更新为 2026-09-04，没有分钟。12:00 只用来把记录放进交易日，不是文章发布的精确时刻。文中收盘价与本页该日收盘一致，板块归因是作者的叙述。',
    relatedSymbols: ['CRCL'],
    tags: ['复盘'],
  },
  {
    id: 'clarity-vote',
    title: '参议院未推进 CLARITY 法案',
    type: '新闻',
    publishedAt: '2026-09-15T15:05:00-04:00',
    summary:
      'CNBC 报道，参议院程序性表决没有达到推进 CLARITY 法案所需的 60 票。CNBC 记为赞成 50、反对 49；其他报道有的记成 49 对 50。报道称 Circle 与 Coinbase 在同一交易日下跌。',
    source: 'CNBC',
    sourceType: '新闻',
    evidence:
      'CNBC 页面的发布时间是 2026-09-15 19:05 UTC，对应美东 15:05，后来更新到下午 4:16。表决的精确分钟没有写在这条时间戳里。票数的先后顺序各篇报道不一致，但都说明没有达到 60 票。',
    relatedSymbols: ['CRCL'],
    tags: ['立法'],
  },
  {
    id: 'clarity-vote-recap',
    title: '次日报道复述 CLARITY 表决',
    type: '新闻',
    publishedAt: '2026-09-16T06:39:58-04:00',
    summary:
      'FXStreet 在下一交易日早晨复述 CLARITY 法案未推进，并同时写到 Circle 启动 Arc 主网。文中提到前一日收于 86.30 美元附近。',
    source: 'FXStreet',
    sourceType: '新闻',
    evidence: '页面时间为 2026-09-16 10:39:58 GMT，换算后是美东 06:39:58。这是表决次日的复述。',
    relatedSymbols: ['CRCL'],
    tags: ['复述'],
  },
  {
    id: 'arc-mainnet',
    title: 'Circle 宣布 Arc 主网上线',
    type: '公告',
    publishedAt: '2026-09-16T06:30:00-04:00',
    summary:
      'Circle 将 Arc 公开主网的上线日期写为 2026-09-16。The Block 于当天上午报道主网开放，并提到 BlackRock、Visa 等机构出现在验证者名单中。',
    source: 'Circle 新闻稿；The Block，James Hunt',
    sourceType: '公司公告',
    evidence:
      'Circle 新闻稿的日期是 2026-09-16。The Block 的署名时间是当天 6:30 a.m. EDT。上线说明的是产品发布，不是对当日跌幅的测量。',
    relatedSymbols: ['CRCL'],
    tags: ['产品'],
  },
  {
    id: 'okx-round',
    title: '报道称 Circle 参与 OKX 融资',
    type: '新闻',
    publishedAt: '2026-10-06T08:00:00-04:00',
    summary:
      'Bloomberg 报道 OKX 完成一轮融资，投前估值 250 亿美元。OKX 称 Circle、Ripple 和渣打旗下 SC Ventures 参与。融资金额没有披露。这是 3 月由洲际交易所领投的同一估值轮次的延伸。',
    source: 'Bloomberg',
    sourceType: '新闻',
    evidence:
      'Bloomberg 的时间是 2026-10-06 8:00 a.m. ET。250 亿美元是报道中的投前估值，不是融资金额，也不是 Circle 的市值。',
    relatedSymbols: ['CRCL'],
    tags: ['融资'],
  },
  {
    id: 'okx-later',
    title: '盘中文章继续讨论 OKX 融资',
    type: '新闻',
    publishedAt: '2026-10-09T13:57:00-04:00',
    summary:
      '24/7 Wall St. 在 2026-10-09 下午继续讨论 Circle 参与 OKX 融资。文章写道盘中上涨约 7%、价格约 86.39 美元。那是文章里的盘中观察。',
    source: '24/7 Wall St.，David Moadel',
    sourceType: '新闻',
    evidence:
      '文章署名时间是 2026-10-09 1:57 p.m. ET。其中的涨幅和价格不是本页使用的收盘价。融资本身在更早的交易日已经报道。',
    relatedSymbols: ['CRCL'],
    tags: ['盘中报道'],
  },
]

function enrich(event: DemoEvent): MappedEvent {
  const mapping = mapPublishedAt(event.publishedAt)
  if (mapping.status === 'mapped') {
    return {
      ...event,
      exchangeTime: mapping.clock.exchangeTime,
      offset: mapping.clock.offset,
      mappedTradeDate: mapping.mappedTradeDate,
      outOfRangeReason: null,
    }
  }
  return {
    ...event,
    exchangeTime: mapping.clock.exchangeTime,
    offset: mapping.clock.offset,
    mappedTradeDate: null,
    outOfRangeReason: mapping.reason,
  }
}

export const mappedEvents: MappedEvent[] = RAW_EVENTS.map(enrich)

export function eventById(id: string): MappedEvent | undefined {
  return mappedEvents.find((event) => event.id === id)
}

export type TimelineEntry = MappedEvent & {
  position: string
  timeAssociated: boolean
  judgment: '时间相关性'
  limitation: string
}

export function temporalPosition(mappedTradeDate: string, selected: SessionQuote): string {
  const sessions = tradingSessions()
  const selectedIndex = sessions.indexOf(selected.tradeDate)
  const mappedIndex = sessions.indexOf(mappedTradeDate)
  const side = mappedIndex < selectedIndex ? '前' : mappedIndex > selectedIndex ? '后' : '当日'
  if (selected.anomaly) {
    if (side === '前') return '异动前'
    if (side === '后') return '异动后'
    return '异动当日'
  }
  if (side === '前') return '所选日前'
  if (side === '后') return '所选日后'
  return '所选日当日'
}

export function eventsForSelection(selected: SessionQuote): {
  windowEvents: TimelineEntry[]
  unmapped: MappedEvent[]
} {
  const sessions = tradingSessions()
  const index = sessions.indexOf(selected.tradeDate)
  const window = new Set(
    [sessions[index - 1], sessions[index], sessions[index + 1]].filter((date): date is string => Boolean(date)),
  )
  const windowEvents = mappedEvents
    .filter((event) => event.mappedTradeDate !== null && window.has(event.mappedTradeDate))
    .map((event) => ({
      ...event,
      position: temporalPosition(event.mappedTradeDate as string, selected),
      timeAssociated: event.mappedTradeDate === selected.tradeDate,
      judgment: '时间相关性' as const,
      limitation: TIME_LIMIT,
    }))
    .sort((left, right) => left.publishedAt.localeCompare(right.publishedAt))

  return {
    windowEvents,
    unmapped: mappedEvents.filter((event) => event.mappedTradeDate === null),
  }
}

export function correlationFor(event: MappedEvent): { judgment: string; limitation: string } {
  if (event.mappedTradeDate === null) {
    return { judgment: '事实', limitation: RANGE_LIMIT }
  }
  return { judgment: '时间相关性', limitation: TIME_LIMIT }
}

export function selectedSession(tradeDate: string): SessionQuote {
  const session = sessionByDate(tradeDate)
  if (!session) throw new Error(`未知交易日 ${tradeDate}`)
  return session
}
