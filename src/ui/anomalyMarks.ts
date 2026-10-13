import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import type { ISeriesPrimitive, SeriesAttachedParameter, Time } from 'lightweight-charts'
import type { SessionQuote } from '../domain/circleDemo'

type Kind = 'idle' | 'preview' | 'selected'

type Mark = {
  x: number
  label: string
  kind: Kind
}

const GOLD = '#f0b90b'

/**
 * Only the selected anomaly day is highlighted on the price pane.
 * Other anomaly days are small axis triangles. Hovering one previews a line and date.
 * Dates are drawn on the time-axis pane because lightweight-charts 4.2 ignores fixedCoordinate.
 */
export class AnomalyMarks implements ISeriesPrimitive {
  private chart: SeriesAttachedParameter<Time>['chart'] | null = null
  private requestUpdate: (() => void) | null = null
  private hover: string | null = null
  private selected: string | null = null
  private marks: Mark[] = []
  private spacing = 6

  private readonly paneViewList = [
    { zOrder: () => 'bottom' as const, renderer: () => this.columnPaint },
    { zOrder: () => 'top' as const, renderer: () => this.linePaint },
  ]

  private readonly axisViewList = [{ zOrder: () => 'top' as const, renderer: () => this.axisPaint }]

  private readonly columnPaint = {
    draw() {},
    drawBackground: (target: CanvasRenderingTarget2D) => {
      const mark = this.marks.find((item) => item.kind === 'selected')
      if (!mark) return
      const spacing = this.spacing
      target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, bitmapSize }) => {
        const width = candleBodyWidth(spacing, horizontalPixelRatio)
        const left = Math.round(mark.x * horizontalPixelRatio) - Math.floor(width * 0.5)
        context.fillStyle = 'rgba(240, 185, 11, 0.46)'
        context.fillRect(left, 0, width, bitmapSize.height)
      })
    },
  }

  private readonly linePaint = {
    draw: (target: CanvasRenderingTarget2D) => {
      const marks = this.marks.filter((item) => item.kind !== 'idle')
      if (marks.length === 0) return
      target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, bitmapSize }) => {
        const dash = Math.max(5, Math.round(5 * horizontalPixelRatio))
        const gap = Math.max(4, Math.round(4 * horizontalPixelRatio))
        context.lineWidth = Math.max(1, horizontalPixelRatio)
        context.setLineDash([dash, gap])
        context.strokeStyle = GOLD
        for (const mark of marks) {
          const x = Math.round(mark.x * horizontalPixelRatio)
          context.beginPath()
          context.moveTo(x, 0)
          context.lineTo(x, bitmapSize.height)
          context.stroke()
        }
        context.setLineDash([])
      })
    },
  }

  private readonly axisPaint = {
    draw: (target: CanvasRenderingTarget2D) => {
      const marks = this.marks
      const spacing = this.spacing
      target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, verticalPixelRatio, bitmapSize }) => {
        const fontSize = Math.max(11, Math.round(11 * verticalPixelRatio))
        context.font = `600 ${fontSize}px sans-serif`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        const gap = Math.max(1, spacing * horizontalPixelRatio)
        const base = Math.max(1, Math.min(5 * horizontalPixelRatio, Math.floor(gap) - 1))
        const tri = Math.round(6 * verticalPixelRatio)
        context.fillStyle = GOLD
        for (const mark of marks) {
          const x = Math.round(mark.x * horizontalPixelRatio)
          paintTriangle(context, x, Math.round(verticalPixelRatio), base, tri)
        }
        const padX = Math.round(5 * horizontalPixelRatio)
        const height = Math.round(15 * verticalPixelRatio)
        const radius = Math.round(3 * horizontalPixelRatio)
        const y = Math.max(Math.round(tri + 2 * verticalPixelRatio), Math.round((bitmapSize.height - height) / 2))
        const labeled = marks.filter((item) => item.kind !== 'idle')
        for (const mark of labeled) {
          const textWidth = context.measureText(mark.label).width
          const width = Math.ceil(textWidth + padX * 2)
          let x = Math.round(mark.x * horizontalPixelRatio - width / 2)
          if (x < 1) x = 1
          if (x + width > bitmapSize.width - 1) x = Math.max(1, bitmapSize.width - 1 - width)
          roundRect(context, x, y, width, height, radius)
          context.fillStyle = GOLD
          context.fill()
          context.fillStyle = '#1a1408'
          context.fillText(mark.label, x + width / 2, y + Math.round(height / 2))
        }
      })
    },
  }

  constructor(private readonly bars: SessionQuote[]) {}

  attached(param: SeriesAttachedParameter<Time>): void {
    this.chart = param.chart
    this.requestUpdate = param.requestUpdate
  }

  detached(): void {
    this.chart = null
    this.requestUpdate = null
  }

  setHover(tradeDate: string | null): void {
    if (this.hover === tradeDate) return
    this.hover = tradeDate
    this.requestUpdate?.()
  }

  setSelected(tradeDate: string | null): void {
    if (this.selected === tradeDate) return
    this.selected = tradeDate
    this.requestUpdate?.()
  }

  updateAllViews(): void {
    const timeScale = this.chart?.timeScale()
    if (!timeScale) return
    this.spacing = timeScale.options().barSpacing
    const next: Mark[] = []
    for (const bar of this.bars) {
      if (!bar.anomaly) continue
      const x = timeScale.timeToCoordinate(bar.tradeDate as Time)
      if (x === null) continue
      const kind: Kind =
        bar.tradeDate === this.selected ? 'selected' : bar.tradeDate === this.hover ? 'preview' : 'idle'
      next.push({ x, label: bar.tradeDate.slice(5), kind })
    }
    this.marks = next
  }

  paneViews() {
    return this.paneViewList
  }

  timeAxisPaneViews() {
    return this.axisViewList
  }
}

function candleBodyWidth(barSpacing: number, pixelRatio: number): number {
  let width: number
  if (barSpacing >= 2.5 && barSpacing <= 4) width = Math.floor(3 * pixelRatio)
  else {
    const coeff = 1 - (0.2 * Math.atan(Math.max(4, barSpacing) - 4)) / (Math.PI * 0.5)
    const drawn = Math.floor(barSpacing * coeff * pixelRatio)
    width = Math.max(Math.floor(pixelRatio), Math.min(drawn, Math.floor(barSpacing * pixelRatio)))
  }
  if (width >= 2 && Math.floor(pixelRatio) % 2 !== width % 2) width -= 1
  return Math.max(1, width)
}

function paintTriangle(
  context: CanvasRenderingContext2D,
  x: number,
  top: number,
  base: number,
  height: number,
) {
  const width = Math.max(1, Math.round(base))
  const rows = Math.max(1, Math.round(height))
  for (let row = 0; row < rows; row += 1) {
    const span = Math.max(1, Math.round((width * (row + 1)) / rows))
    const left = x - Math.floor(span / 2)
    context.fillRect(left, top + row, span, 1)
  }
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, height / 2, width / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}
