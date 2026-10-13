import { ColorType, createChart, type ISeriesApi, type MouseEventParams, type Time } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import type { SessionQuote } from '../domain/circleDemo'
import { formatPercent } from './format'
import { AnomalyMarks } from './anomalyMarks'

type CandleChartProps = {
  bars: SessionQuote[]
  selectedDate: string
  onSelect: (tradeDate: string) => void
}

function tradeDateFromClick(param: MouseEventParams<Time>): string | null {
  const time = param.time
  if (typeof time === 'string') return time
  if (time && typeof time === 'object' && 'year' in time) {
    const month = String(time.month).padStart(2, '0')
    const day = String(time.day).padStart(2, '0')
    return `${time.year}-${month}-${day}`
  }
  return null
}

export function CandleChart({ bars, selectedDate, onSelect }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const marksRef = useRef<AnomalyMarks | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedRef = useRef(selectedDate)
  onSelectRef.current = onSelect
  selectedRef.current = selectedDate
  const [tip, setTip] = useState<{ bar: SessionQuote; left: number; top: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#848e9c',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 3 },
      crosshair: {
        // mode 0 follows the pointer. style 2 is dashed. Clicking does not add a price line.
        mode: 0,
        vertLine: { color: '#ffffff', width: 1, style: 2, labelBackgroundColor: '#2a2a2a' },
        horzLine: { color: '#ffffff', width: 1, style: 2, labelBackgroundColor: '#2a2a2a' },
      },
    })

    const last = bars[bars.length - 1]
    const lastUp = last ? (last.changePercent ?? 0) >= 0 : true
    const candles = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      priceLineVisible: true,
      lastValueVisible: true,
      priceLineColor: lastUp ? '#0ecb81' : '#f6465d',
    })
    const volume = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    })
    candles.priceScale().applyOptions({
      scaleMargins: { top: 0.06, bottom: 0.24 },
    })
    candles.setData(
      bars.map((bar) => ({
        time: bar.tradeDate as Time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    )
    volume.setData(
      bars.map((bar) => ({
        time: bar.tradeDate as Time,
        value: bar.volume,
        color: bar.close >= bar.open ? 'rgba(14, 203, 129, 0.9)' : 'rgba(246, 70, 93, 0.9)',
      })),
    )
    const marks = new AnomalyMarks(bars)
    marks.setSelected(selectedRef.current)
    candles.attachPrimitive(marks)
    marksRef.current = marks
    chart.timeScale().fitContent()
    chart.timeScale().applyOptions({ rightOffset: 3, borderVisible: false })
    const anomalyByDate = new Map(bars.filter((bar) => bar.anomaly).map((bar) => [bar.tradeDate, bar]))
    let hovered = ''
    const onMove = (param: MouseEventParams<Time>) => {
      const tradeDate = tradeDateFromClick(param)
      const bar = tradeDate ? anomalyByDate.get(tradeDate) : undefined
      const point = param.point
      if (!bar || !point || !container) {
        if (hovered) {
          hovered = ''
          marks.setHover(null)
          setTip(null)
        }
        return
      }
      if (hovered !== bar.tradeDate) {
        hovered = bar.tradeDate
        marks.setHover(bar.tradeDate)
      }
      const width = container.clientWidth
      const height = container.clientHeight
      setTip({
        bar,
        left: Math.max(8, Math.min(point.x + 14, width - 248)),
        top: point.y > height * 0.62 ? Math.max(8, point.y - 92) : point.y + 14,
      })
    }
    chart.subscribeClick((param) => {
      const tradeDate = tradeDateFromClick(param)
      if (tradeDate) onSelectRef.current(tradeDate)
    })
    chart.subscribeCrosshairMove(onMove)
    seriesRef.current = candles

    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      seriesRef.current = null
      marksRef.current = null
      chart.remove()
    }
  }, [bars])

  useEffect(() => {
    marksRef.current?.setSelected(selectedDate)
  }, [selectedDate])

  const up = tip ? (tip.bar.changePercent ?? 0) >= 0 : false

  return (
    <>
      <div className="chart-canvas" ref={containerRef} />
      {tip ? (
        <div className="anomaly-tip" role="tooltip" style={{ left: tip.left, top: tip.top }}>
          <p className="anomaly-tip-head">
            <time dateTime={tip.bar.tradeDate}>{tip.bar.tradeDate.slice(5)}</time>
            <strong className={up ? 'up' : 'down'}>{formatPercent(tip.bar.changePercent)}</strong>
            <span>
              {tip.bar.direction} · {tip.bar.severity}
            </span>
          </p>
          {tip.bar.reason ? <p>{tip.bar.reason}</p> : null}
        </div>
      ) : null}
    </>
  )
}
