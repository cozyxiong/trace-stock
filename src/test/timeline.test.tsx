import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Workspace } from '../ui/Workspace'

vi.mock('lightweight-charts', () => {
  const series = () => ({
    setData: vi.fn(),
    setMarkers: vi.fn(),
    attachPrimitive: vi.fn(),
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
    createPriceLine: vi.fn(() => ({ applyOptions: vi.fn() })),
    removePriceLine: vi.fn(),
  })
  return {
    ColorType: { Solid: 'solid' },
    createChart: vi.fn(() => ({
      addCandlestickSeries: vi.fn(series),
      addHistogramSeries: vi.fn(series),
      priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
      timeScale: vi.fn(() => ({ fitContent: vi.fn(), applyOptions: vi.fn() })),
      subscribeClick: vi.fn(),
      subscribeCrosshairMove: vi.fn(),
      unsubscribeCrosshairMove: vi.fn(),
      remove: vi.fn(),
    })),
  }
})

async function openWorkspace() {
  render(<Workspace />)
  expect(await screen.findByRole('heading', { name: 'Circle' })).toBeInTheDocument()
}

function field(scope: HTMLElement, term: string): HTMLElement {
  const row = within(scope).getByText(term).closest('div')
  if (!row) throw new Error(`缺少${term}`)
  return row
}

describe('事件时间线与映射', () => {
  it('收盘后的 GENIUS 表决映射到下一交易日', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2025-06-18 +33.82% 异动 上涨 显著' }))
    await user.click(screen.getByRole('button', { name: /参议院通过 GENIUS 稳定币法案/ }))
    const detail = screen.getByRole('region', { name: '事件详情' })
    const card = screen.getByRole('button', { name: /参议院通过 GENIUS 稳定币法案/ })
    expect(field(detail, '发布时间')).toHaveTextContent('2025-06-17 17:46:00 -04:00')
    expect(detail).not.toHaveTextContent('开盘前及交易时段发生的事件映射至当日')
    expect(card).toHaveTextContent('06-17 17:46 · 官方记录')
    expect(card).not.toHaveTextContent('映射交易日')
    expect(card).toHaveAccessibleName(/异动当日/)
    expect(field(detail, '来源')).toHaveTextContent('美国参议院')
    expect(field(detail, '来源')).toHaveTextContent('官方记录')
    expect(field(detail, '来源')).not.toHaveTextContent('每日新闻稿')
    expect(field(detail, '相关性判断')).toHaveTextContent('时间相关性')
    const judgment = within(detail).getByRole('region', { name: '相关性判断' })
    expect(judgment).not.toHaveTextContent('不能据此认定')
    expect(judgment).not.toHaveTextContent('映射到相近交易日')
    expect(judgment).not.toHaveTextContent('当前没有选中的分析结论')
    expect(judgment).not.toHaveTextContent('局限')
    expect(within(detail).getByRole('region', { name: '摘要' })).toBeInTheDocument()
  })

  it('开盘前的业绩归到当天，交易时段内的草案报道也归到当天', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2026-02-25 +35.47% 异动 上涨 显著' }))
    await user.click(screen.getByRole('button', { name: /Circle 公布第四季业绩/ }))
    const detail = screen.getByRole('region', { name: '事件详情' })
    const earnings = screen.getByRole('button', { name: /Circle 公布第四季业绩/ })
    expect(earnings).toHaveAccessibleName(/财务数据/)
    expect(field(detail, '发布时间')).toHaveTextContent('2026-02-25 08:00:00 -05:00')
    expect(earnings).toHaveTextContent('02-25 08:00 · 公司公告')
    expect(earnings).not.toHaveTextContent('映射交易日')
    expect(earnings).toHaveAccessibleName(/异动当日/)
    expect(earnings).toHaveAccessibleName(/时间关联/)
    expect(earnings).not.toHaveAccessibleName(/股价原因/)
    expect(field(detail, '证据')).toHaveTextContent('不是业绩稿的精确分钟')

    await user.click(screen.getByRole('button', { name: '2026-03-24 -20.11% 异动 下跌 显著' }))
    await user.click(screen.getByRole('button', { name: /报道称 CLARITY 草案收紧稳定币收益/ }))
    const clarity = screen.getByRole('region', { name: '事件详情' })
    const clarityCard = screen.getByRole('button', { name: /报道称 CLARITY 草案收紧稳定币收益/ })
    expect(field(clarity, '发布时间')).toHaveTextContent('2026-03-24 11:47:00 -04:00')
    expect(clarityCard).toHaveTextContent('03-24 11:47 · 新闻')
    expect(clarityCard).not.toHaveTextContent('映射交易日')
    expect(clarityCard).toHaveAccessibleName(/异动当日/)
    const timeline = screen.getByRole('complementary', { name: '事件时间线' })
    expect(within(timeline).getByRole('button', { name: /次日报道复述稳定币收益草案/ })).toHaveAccessibleName(/异动后/)
  })

  it('九月三日的窗口同时有异动前、当日和异动后', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2026-09-03 +16.46% 异动 上涨 显著' }))
    const timeline = screen.getByRole('complementary', { name: '事件时间线' })
    expect(within(timeline).getByRole('button', { name: /Heath Tarbert 在众议院作证/ })).toHaveAccessibleName(/异动前/)
    expect(within(timeline).getByRole('button', { name: /报道将上涨与前一日证词并列/ })).toHaveAccessibleName(
      /异动当日/,
    )
    expect(within(timeline).getByRole('button', { name: /次日文章复盘九月三日收盘/ })).toHaveAccessibleName(/异动后/)

    await user.click(within(timeline).getByRole('button', { name: /Heath Tarbert 在众议院作证/ }))
    const detail = screen.getByRole('region', { name: '事件详情' })
    expect(within(timeline).getByRole('button', { name: /Heath Tarbert 在众议院作证/ })).toHaveTextContent(
      '09-02 12:00 · 公开证词',
    )
    expect(within(timeline).getByRole('button', { name: /Heath Tarbert 在众议院作证/ })).not.toHaveTextContent(
      '映射交易日',
    )
    expect(field(detail, '证据')).toHaveTextContent('12:00 只用来把记录放进交易日')
  })

  it('没有邻近事件时只显示暂无相关事件，未能映射一栏为空', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2025-12-01 -4.99%' }))
    const timeline = screen.getByRole('complementary', { name: '事件时间线' })
    expect(within(timeline).getByText('暂无相关事件')).toBeInTheDocument()
    const unmapped = screen.getByRole('region', { name: '未能映射' })
    expect(within(unmapped).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('事件筛选与详情抽屉', () => {
  it('按公告、新闻、财务筛选当前窗口', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2026-09-03 +16.46% 异动 上涨 显著' }))
    const timeline = screen.getByRole('complementary', { name: '事件时间线' })
    expect(within(timeline).getByText('异动日')).toBeInTheDocument()
    expect(within(timeline).getByText('2026-09-03')).toBeInTheDocument()

    await user.click(within(timeline).getByRole('button', { name: '公告' }))
    expect(within(timeline).getByRole('button', { name: /Heath Tarbert 在众议院作证/ })).toBeInTheDocument()
    expect(within(timeline).queryByRole('button', { name: /报道将上涨与前一日证词并列/ })).not.toBeInTheDocument()

    await user.click(within(timeline).getByRole('button', { name: '财务' }))
    expect(within(timeline).getByText('当前筛选下暂无事件')).toBeInTheDocument()

    await user.click(within(timeline).getByRole('button', { name: '全部' }))
    expect(within(timeline).getByRole('button', { name: /次日文章复盘九月三日收盘/ })).toBeInTheDocument()
  })

  it('从右侧抽屉查看事件，并用关闭键、遮罩和 Esc 还原', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: /参议院未推进 CLARITY 法案/ }))
    const detail = screen.getByRole('region', { name: '事件详情' })
    expect(within(detail).getByRole('heading', { name: '参议院未推进 CLARITY 法案' })).toBeInTheDocument()
    expect(within(detail).getByText('发布时间')).toBeInTheDocument()
    expect(detail).not.toHaveTextContent('开盘前及交易时段发生的事件映射至当日')
    expect(within(detail).queryByText('局限')).not.toBeInTheDocument()
    expect(detail).not.toHaveTextContent('当前没有选中的分析结论')
    expect(within(detail).getByRole('region', { name: '相关性判断' })).not.toHaveTextContent('不能据此认定')
    expect(detail).not.toHaveTextContent('映射到相近交易日只说明发布时间落在哪个交易日')
    expect(within(detail).queryByText('演示数据 · 非真实信息')).not.toBeInTheDocument()
    expect(within(detail).queryByText(/（演示）/)).not.toBeInTheDocument()

    await user.click(within(detail).getByRole('button', { name: /CNBC/ }))
    expect(within(detail).getByRole('button', { name: /CNBC/ })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '关闭详情' }))
    expect(screen.getByRole('region', { name: '事件详情' })).toHaveTextContent('选择时间线上的事件以查看详情')

    await user.click(screen.getByRole('button', { name: /参议院未推进 CLARITY 法案/ }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('region', { name: '事件详情' })).toHaveTextContent('选择时间线上的事件以查看详情')

    await user.click(screen.getByRole('button', { name: /参议院未推进 CLARITY 法案/ }))
    await user.click(screen.getByRole('button', { name: '关闭事件详情' }))
    expect(screen.getByRole('region', { name: '事件详情' })).toHaveTextContent('选择时间线上的事件以查看详情')
    expect(screen.queryByRole('button', { name: '关闭事件详情' })).not.toBeInTheDocument()
  })
})

describe('Agent 结论', () => {
  it('默认异动日给出可追溯的假设，点击后高亮当天的表决报道', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    expect(screen.queryByRole('complementary', { name: 'Agent' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开 Agent' }))
    const agent = screen.getByRole('complementary', { name: 'Agent' })
    expect(within(agent).getByRole('heading', { name: '当前异动日 2026-09-15 · 分析已同步' })).toBeInTheDocument()
    expect(within(agent).getByText('分数根据公开报道整理，不是统计概率。')).toBeInTheDocument()
    expect(within(agent).getByText('结论')).toBeInTheDocument()
    expect(within(agent).getByText('分析依据')).toBeInTheDocument()
    expect(within(agent).getByText('置信度')).toBeInTheDocument()
    expect(within(agent).getByText('不确定性')).toBeInTheDocument()
    expect(screen.queryByText('次日复述可能已经是 2026-09-15 下跌的确定原因。')).not.toBeInTheDocument()
    expect(within(agent).queryByText('现有证据不足以判断主要驱动因素')).not.toBeInTheDocument()
    await user.click(within(agent).getByRole('button', { name: '参议院未推进 CLARITY 法案' }))
    const detail = screen.getByRole('region', { name: '事件详情' })
    expect(within(detail).getByRole('heading', { name: '参议院未推进 CLARITY 法案' })).toBeInTheDocument()
    const judgment = within(detail).getByRole('region', { name: '相关性判断' })
    expect(judgment).toHaveTextContent('因果假设')
    expect(judgment).toHaveTextContent('依据')
    expect(judgment).toHaveTextContent('置信度')
    expect(judgment).toHaveTextContent('不确定性')
    expect(judgment).toHaveTextContent('0.46')
    expect(judgment).toHaveTextContent('可能')
    expect(judgment).not.toHaveTextContent('已经导致')
    expect(within(detail).getByRole('region', { name: '摘要' })).toHaveTextContent('60 票')
    const timeline = screen.getByRole('complementary', { name: '事件时间线' })
    expect(within(timeline).getByRole('button', { name: /参议院未推进 CLARITY 法案/ })).toHaveAccessibleName(/已引用/)
    expect(within(timeline).getByRole('button', { name: /次日报道复述 CLARITY 表决/ })).not.toHaveAccessibleName(/已引用/)

    await user.click(screen.getByRole('button', { name: '关闭 Agent' }))
    expect(screen.queryByRole('complementary', { name: 'Agent' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '事件详情' })).getByRole('heading', { name: '参议院未推进 CLARITY 法案' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开 Agent' }))

    await user.click(screen.getByRole('button', { name: '2025-06-18 +33.82% 异动 上涨 显著' }))
    expect(screen.getByRole('region', { name: '事件详情' })).toHaveTextContent('选择时间线上的事件以查看详情')
    await user.click(within(screen.getByRole('complementary', { name: 'Agent' })).getByRole('button', { name: '参议院通过 GENIUS 稳定币法案' }))
    expect(within(screen.getByRole('complementary', { name: '事件时间线' })).getByRole('button', { name: /参议院通过 GENIUS 稳定币法案/ })).toHaveAccessibleName(/已引用/)
    expect(screen.getByRole('region', { name: '事件详情' })).toHaveTextContent('可能')
  })

  it('有因果假设时只保留假设，不把业绩发布记录当成驱动因素', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2026-02-25 +35.47% 异动 上涨 显著' }))
    await user.click(screen.getByRole('button', { name: '打开 Agent' }))
    const agent = screen.getByRole('complementary', { name: 'Agent' })
    expect(within(agent).getByRole('heading', { name: '当前异动日 2026-02-25 · 分析已同步' })).toBeInTheDocument()
    expect(within(agent).getByRole('button', { name: 'Circle 公布第四季业绩' })).toBeInTheDocument()
    expect(within(agent).queryByRole('heading', { name: '第四季业绩已经公布' })).not.toBeInTheDocument()
    expect(within(agent).queryByText('现有证据不足以判断主要驱动因素')).not.toBeInTheDocument()
    expect(within(agent).getByText(/这是假设，不是确定原因/)).toBeInTheDocument()
    expect(agent).not.toHaveTextContent('已经导致')
  })

  it('证据不足时不把同一天的产品发布写成原因，换日后不留下上一日的内容', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '打开 Agent' }))
    await user.click(within(screen.getByRole('complementary', { name: 'Agent' })).getByRole('button', { name: '参议院未推进 CLARITY 法案' }))
    await user.click(screen.getByRole('button', { name: '2026-09-16 -6.78% 异动 下跌 中等' }))
    const header = screen.getByRole('banner')
    expect(within(header).getByText('-6.78%')).toBeInTheDocument()
    expect(within(header).queryByText('-11.41%')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '事件详情' })).toHaveTextContent('选择时间线上的事件以查看详情')
    expect(screen.queryByText('可能是 2026-09-15 下跌的影响因素之一')).not.toBeInTheDocument()

    const agent = screen.getByRole('complementary', { name: 'Agent' })
    expect(within(agent).getByRole('heading', { name: '当前异动日 2026-09-16' })).toBeInTheDocument()
    expect(within(agent).queryByText(/分析已同步/)).not.toBeInTheDocument()
    expect(within(agent).getByText('现有证据不足以判断主要驱动因素')).toBeInTheDocument()
    expect(within(agent).getByRole('heading', { name: /Arc 主网已宣布上线/ })).toBeInTheDocument()
    expect(within(agent).getByRole('heading', { name: /上线与下跌同一天/ })).toBeInTheDocument()
    expect(within(agent).queryByRole('heading', { name: /CLARITY 未获推进/ })).not.toBeInTheDocument()
    await user.click(within(agent).getAllByRole('button', { name: 'Circle 宣布 Arc 主网上线' })[0])
    const detail = screen.getByRole('region', { name: '事件详情' })
    expect(within(detail).getByRole('heading', { name: 'Circle 宣布 Arc 主网上线' })).toBeInTheDocument()
    expect(within(detail).getByRole('region', { name: '相关性判断' })).toHaveTextContent('事实')
    expect(within(detail).getByRole('region', { name: '相关性判断' })).toHaveTextContent('不是对下跌的解释')
    expect(within(detail).getByRole('region', { name: '相关性判断' })).not.toHaveTextContent('已经导致')

    await user.click(screen.getByRole('button', { name: '关闭 Agent' }))
    expect(screen.queryByRole('complementary', { name: 'Agent' })).not.toBeInTheDocument()
    expect(screen.queryByText('现有证据不足以判断主要驱动因素')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '事件详情' })).getByRole('heading', { name: 'Circle 宣布 Arc 主网上线' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开 Agent' }))
    expect(within(screen.getByRole('complementary', { name: 'Agent' })).getByText('现有证据不足以判断主要驱动因素')).toBeInTheDocument()
  })

  it('侧边栏可以收起，再点一次打开', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    expect(screen.getByRole('complementary', { name: '事件时间线' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开 Agent' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '收起侧边栏' }))
    expect(screen.queryByRole('complementary', { name: '事件时间线' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Agent' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开 Agent' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '事件详情' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开侧边栏' }))
    expect(screen.getByRole('complementary', { name: '事件时间线' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起侧边栏' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('没有预设的异动日和普通交易日都不编造驱动因素', async () => {
    const user = userEvent.setup()
    await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2025-08-15 +7.20% 异动 上涨 中等' }))
    expect(screen.getByRole('complementary', { name: '事件时间线' })).toHaveTextContent('暂无相关事件')
    await user.click(screen.getByRole('button', { name: '打开 Agent' }))
    const agent = screen.getByRole('complementary', { name: 'Agent' })
    expect(within(agent).getByRole('heading', { name: '当前异动日 2025-08-15' })).toBeInTheDocument()
    expect(within(agent).getByText('当前日期没有预设分析结果。')).toBeInTheDocument()
    expect(within(agent).queryByRole('button', { name: /因果假设|时间相关性|事实/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2026-10-06 +1.00%' }))
    expect(within(agent).getByText('该日不符合异动规则，不给出驱动因素。')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: '事件时间线' })).toHaveTextContent('报道称 Circle 参与 OKX 融资')

    await user.click(screen.getByRole('button', { name: '2026-10-09 +4.54%' }))
    expect(screen.getByRole('complementary', { name: '事件时间线' })).toHaveTextContent('盘中文章继续讨论 OKX 融资')
    expect(within(agent).getByRole('heading', { name: '所选日 2026-10-09' })).toBeInTheDocument()
    expect(within(agent).queryByText(/分析已同步/)).not.toBeInTheDocument()
    expect(within(agent).getByText('该日不符合异动规则，不给出驱动因素。')).toBeInTheDocument()
    expect(screen.queryByText(/业绩预告|行业政策利好/)).not.toBeInTheDocument()
  })
})
