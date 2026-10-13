import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChart } from 'lightweight-charts'
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
  expect(screen.getByRole('status')).toHaveTextContent('正在打开本地行情')
  expect(await screen.findByRole('heading', { name: 'Circle' })).toBeInTheDocument()
  return screen.getByRole('banner')
}

describe('Circle 日 K', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('标明行情截止日，并默认打开 2026-09-15 的下跌异动', async () => {
    const header = await openWorkspace()
    expect(screen.getByRole('note')).toHaveTextContent(
      '行情为 CRCL 公开日线，自 2025-06-06 起，不含上市当日，截至 2026-10-09。事件摘自公开报道，不是对涨跌的已证实解释。',
    )
    expect(within(header).getByText('CRCL')).toBeInTheDocument()
    expect(within(header).getByText('NYSE')).toBeInTheDocument()
    expect(within(header).getByText('USD')).toBeInTheDocument()
    expect(within(header).getByText('2026-09-15')).toBeInTheDocument()
    expect(figure(header, '涨跌幅')).toHaveTextContent('-11.41%')
    expect(figure(header, '异动')).toHaveTextContent('下跌 · 显著')
    expect(figure(header, '收盘')).toHaveTextContent('86.30')
    expect(figure(header, '开盘')).toHaveTextContent('92.30')
    expect(screen.getByRole('button', { name: '日K' })).toHaveAttribute('aria-pressed', 'true')
    for (const interval of ['分时', '1分', '15分', '1小时']) {
      expect(screen.getByRole('button', { name: interval })).toBeDisabled()
    }
    const chart = vi.mocked(createChart).mock.results.at(-1)?.value as {
      addCandlestickSeries: { mock: { results: { value: { setMarkers: { mock: { calls: unknown[] } }; attachPrimitive: { mock: { calls: unknown[] } } } }[] } }
    }
    const series = chart.addCandlestickSeries.mock.results.at(-1)?.value
    expect(series?.setMarkers.mock.calls).toHaveLength(0)
    expect(series?.attachPrimitive.mock.calls.length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '2026-09-15 -11.41% 异动 下跌 显著' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('只列出开盘之后的已完成交易日', async () => {
    await openWorkspace()
    const strip = screen.getByRole('navigation', { name: '交易日' })
    const dates = within(strip).getAllByRole('button')
    expect(dates).toHaveLength(338)
    expect(dates[0]).toHaveAccessibleName('2025-06-06')
    expect(dates[dates.length - 1]).toHaveAccessibleName('2026-10-09 +4.54%')
    expect(screen.getByRole('button', { name: '2025-06-18 +33.82% 异动 上涨 显著' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2026-10-09 +4.54%' }).textContent).not.toContain('异动')
    expect(screen.queryByRole('button', { name: /数据异常/ })).not.toBeInTheDocument()
    for (const absent of ['2025-06-05', '2025-06-07', '2025-06-08', '2025-06-19', '2026-10-12']) {
      expect(screen.queryByRole('button', { name: new RegExp(`^${absent}`) })).not.toBeInTheDocument()
    }
  })

  it('用日期控件切换交易日后，顶栏换成该日行情', async () => {
    const user = userEvent.setup()
    const header = await openWorkspace()
    await user.click(screen.getByRole('button', { name: '2025-06-18 +33.82% 异动 上涨 显著' }))
    expect(within(header).getByText('2025-06-18')).toBeInTheDocument()
    expect(figure(header, '涨跌幅')).toHaveTextContent('+33.82%')
    expect(figure(header, '异动')).toHaveTextContent('上涨 · 显著')
    expect(figure(header, '收盘')).toHaveTextContent('199.59')
    expect(within(header).queryByText('-11.41%')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2025-06-06' }))
    expect(figure(header, '涨跌幅')).toHaveTextContent('—')
    expect(within(header).queryByText('异动')).not.toBeInTheDocument()
  })
})

function figure(header: HTMLElement, term: string): HTMLElement {
  const row = within(header).getByText(term).closest('div')
  if (!row) throw new Error(`缺少${term}`)
  return row
}
