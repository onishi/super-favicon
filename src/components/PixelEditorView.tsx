import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { getPixelsCodeFromLocation, setPixelsCodeInLocation } from '../lib/editor-url'
import { colorForValue, OFF_COLOR, PALETTE, renderPaletteBufferToCanvas } from '../lib/palette'
import {
  GRID_SIZE,
  clearPixelBuffer,
  createPixelBuffer,
  fillRect,
  floodFill,
  getPixel,
  setPixel,
  type PixelBuffer,
} from '../lib/pixel-buffer'
import { codeToPixelBuffer, pixelBufferToCode } from '../lib/pixel-code'

const DISPLAY_SCALE = 8
const DEFAULT_VALUE = PALETTE[PALETTE.length - 1].value
const MAX_HISTORY = 50

type Tool = 'pen' | 'rect' | 'fill'

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'pen', label: 'ペン' },
  { id: 'rect', label: '矩形' },
  { id: 'fill', label: '塗りつぶし' },
]

interface RectPreview {
  x0: number
  y0: number
  x1: number
  y1: number
  value: number
}

interface PixelEditorViewProps {
  onExit: () => void
  onStartLifeGame: (pixelsCode: string) => void
}

function chunkCode(code: string, lineLength: number): string {
  const lines: string[] = []
  for (let i = 0; i < code.length; i += lineLength) {
    lines.push(code.slice(i, i + lineLength))
  }
  return lines.join('\n')
}

function getCellFromPointer(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const relX = (event.clientX - rect.left) / rect.width
  const relY = (event.clientY - rect.top) / rect.height
  const x = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(relX * GRID_SIZE)))
  const y = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(relY * GRID_SIZE)))
  return { x, y }
}

function renderEditorCanvas(buffer: PixelBuffer, canvas: HTMLCanvasElement, preview: RectPreview | null): void {
  renderPaletteBufferToCanvas(buffer, canvas)
  if (!preview) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const minX = Math.min(preview.x0, preview.x1)
  const maxX = Math.max(preview.x0, preview.x1)
  const minY = Math.min(preview.y0, preview.y1)
  const maxY = Math.max(preview.y0, preview.y1)
  ctx.fillStyle = preview.value === 0 ? OFF_COLOR : colorForValue(preview.value)
  ctx.fillRect(minX, minY, maxX - minX + 1, maxY - minY + 1)
}

export function PixelEditorView({ onExit, onStartLifeGame }: PixelEditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<PixelBuffer | null>(null)
  const isDrawingRef = useRef(false)
  const paintValueRef = useRef(DEFAULT_VALUE)
  const rectPreviewRef = useRef<RectPreview | null>(null)
  const undoStackRef = useRef<PixelBuffer[]>([])
  const redoStackRef = useRef<PixelBuffer[]>([])
  const [selectedValue, setSelectedValue] = useState(DEFAULT_VALUE)
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [, forceHistoryRerender] = useState(0)

  if (!bufferRef.current) {
    const initialCode = getPixelsCodeFromLocation()
    bufferRef.current = initialCode ? codeToPixelBuffer(initialCode) : createPixelBuffer()
  }

  const [code, setCode] = useState(() => pixelBufferToCode(bufferRef.current as PixelBuffer))

  const redraw = useCallback(() => {
    if (canvasRef.current && bufferRef.current) {
      renderEditorCanvas(bufferRef.current, canvasRef.current, rectPreviewRef.current)
    }
  }, [])

  useEffect(() => {
    redraw()
  }, [redraw])

  const commitChange = useCallback(() => {
    const nextCode = pixelBufferToCode(bufferRef.current as PixelBuffer)
    setCode(nextCode)
    setPixelsCodeInLocation(nextCode)
  }, [])

  const pushHistory = useCallback(() => {
    const snapshot = (bufferRef.current as PixelBuffer).slice() as PixelBuffer
    undoStackRef.current.push(snapshot)
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift()
    redoStackRef.current = []
    forceHistoryRerender((v) => v + 1)
  }, [])

  const handleUndo = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push((bufferRef.current as PixelBuffer).slice() as PixelBuffer)
    bufferRef.current = previous
    redraw()
    commitChange()
    forceHistoryRerender((v) => v + 1)
  }, [redraw, commitChange])

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push((bufferRef.current as PixelBuffer).slice() as PixelBuffer)
    bufferRef.current = next
    redraw()
    commitChange()
    forceHistoryRerender((v) => v + 1)
  }, [redraw, commitChange])

  const paintAt = useCallback(
    (x: number, y: number) => {
      setPixel(bufferRef.current as PixelBuffer, x, y, paintValueRef.current)
      redraw()
    },
    [redraw],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = getCellFromPointer(event, canvas)
    const currentValue = getPixel(bufferRef.current as PixelBuffer, x, y)

    if (event.shiftKey) {
      setSelectedValue(currentValue)
      return
    }

    const paintValue = currentValue === selectedValue ? 0 : selectedValue

    if (tool === 'fill') {
      pushHistory()
      floodFill(bufferRef.current as PixelBuffer, x, y, paintValue)
      redraw()
      commitChange()
      return
    }

    if (tool === 'rect') {
      pushHistory()
      rectPreviewRef.current = { x0: x, y0: y, x1: x, y1: y, value: paintValue }
      isDrawingRef.current = true
      redraw()
      return
    }

    pushHistory()
    paintValueRef.current = paintValue
    isDrawingRef.current = true
    paintAt(x, y)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = getCellFromPointer(event, canvas)
    setHoverValue(getPixel(bufferRef.current as PixelBuffer, x, y))

    if (!isDrawingRef.current) return

    if (tool === 'rect' && rectPreviewRef.current) {
      rectPreviewRef.current = { ...rectPreviewRef.current, x1: x, y1: y }
      redraw()
      return
    }

    if (tool === 'pen') paintAt(x, y)
  }

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    if (tool === 'rect' && rectPreviewRef.current) {
      const { x0, y0, x1, y1, value } = rectPreviewRef.current
      fillRect(bufferRef.current as PixelBuffer, x0, y0, x1, y1, value)
      rectPreviewRef.current = null
      redraw()
    }

    commitChange()
  }

  const handlePointerLeave = () => {
    setHoverValue(null)
    handlePointerUp()
  }

  const handleClear = () => {
    pushHistory()
    clearPixelBuffer(bufferRef.current as PixelBuffer)
    redraw()
    commitChange()
  }

  const canUndo = undoStackRef.current.length > 0
  const canRedo = redoStackRef.current.length > 0

  return (
    <div>
      <button type="button" onClick={onExit}>
        ← メニューに戻る
      </button>
      <h2>ドット絵エディタ</h2>
      <p>Shift + クリックでスポイト（カーソル位置の色をパレットから選択）</p>
      <div className="pixel-editor__workspace">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE}
          height={GRID_SIZE}
          style={{
            width: GRID_SIZE * DISPLAY_SCALE,
            height: GRID_SIZE * DISPLAY_SCALE,
            boxSizing: 'border-box',
            imageRendering: 'pixelated',
            border: '1px solid #ccc',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
        <div
          className="pixel-editor__palette"
          style={{ width: GRID_SIZE * DISPLAY_SCALE, height: GRID_SIZE * DISPLAY_SCALE }}
        >
          {PALETTE.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-label={entry.label}
              aria-pressed={selectedValue === entry.value}
              className="pixel-editor__swatch"
              style={{
                backgroundColor: entry.color,
                outline: selectedValue === entry.value ? '3px solid var(--accent)' : undefined,
                boxShadow: hoverValue === entry.value ? '0 0 0 2px var(--text-h)' : undefined,
              }}
              onClick={() => setSelectedValue(entry.value)}
            />
          ))}
        </div>
      </div>
      <div className="pixel-editor__tools">
        {TOOLS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={tool === entry.id}
            className="pixel-editor__tool"
            style={{ outline: tool === entry.id ? '3px solid var(--accent)' : undefined }}
            onClick={() => setTool(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="pixel-editor__actions">
        <button type="button" onClick={handleUndo} disabled={!canUndo}>
          元に戻す
        </button>
        <button type="button" onClick={handleRedo} disabled={!canRedo}>
          やり直す
        </button>
        <button type="button" onClick={handleClear}>
          クリア
        </button>
        <button type="button" onClick={() => onStartLifeGame(code)}>
          この配置でライフゲームを開始
        </button>
      </div>
      <p>この配置のURL（共有・復元用、現在のアドレスバーにも反映されています）</p>
      <code className="pixel-editor__code">{chunkCode(code, GRID_SIZE)}</code>
    </div>
  )
}
