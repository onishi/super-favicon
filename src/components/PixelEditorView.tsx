import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { getPixelsCodeFromLocation, setPixelsCodeInLocation } from '../lib/editor-url'
import { colorForValue, OFF_COLOR, PALETTE } from '../lib/palette'
import {
  GRID_SIZE,
  clearPixelBuffer,
  createPixelBuffer,
  getPixel,
  setPixel,
  type PixelBuffer,
} from '../lib/pixel-buffer'
import { codeToPixelBuffer, pixelBufferToCode } from '../lib/pixel-code'

const DISPLAY_SCALE = 8
const DEFAULT_VALUE = PALETTE[PALETTE.length - 1].value

interface PixelEditorViewProps {
  onExit: () => void
  onStartLifeGame: (pixelsCode: string) => void
}

function getCellFromPointer(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const relX = (event.clientX - rect.left) / rect.width
  const relY = (event.clientY - rect.top) / rect.height
  const x = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(relX * GRID_SIZE)))
  const y = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(relY * GRID_SIZE)))
  return { x, y }
}

function renderPaletteBuffer(buffer: PixelBuffer, canvas: HTMLCanvasElement): void {
  canvas.width = GRID_SIZE
  canvas.height = GRID_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = OFF_COLOR
  ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE)
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const value = buffer[y * GRID_SIZE + x]
      if (value !== 0) {
        ctx.fillStyle = colorForValue(value)
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}

export function PixelEditorView({ onExit, onStartLifeGame }: PixelEditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<PixelBuffer | null>(null)
  const isDrawingRef = useRef(false)
  const paintValueRef = useRef(DEFAULT_VALUE)
  const [selectedValue, setSelectedValue] = useState(DEFAULT_VALUE)

  if (!bufferRef.current) {
    const initialCode = getPixelsCodeFromLocation()
    bufferRef.current = initialCode ? codeToPixelBuffer(initialCode) : createPixelBuffer()
  }

  const [code, setCode] = useState(() => pixelBufferToCode(bufferRef.current as PixelBuffer))

  const redraw = useCallback(() => {
    if (canvasRef.current && bufferRef.current) {
      renderPaletteBuffer(bufferRef.current, canvasRef.current)
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
    paintValueRef.current = currentValue === selectedValue ? 0 : selectedValue
    isDrawingRef.current = true
    paintAt(x, y)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = getCellFromPointer(event, canvas)
    paintAt(x, y)
  }

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    commitChange()
  }

  const handleClear = () => {
    clearPixelBuffer(bufferRef.current as PixelBuffer)
    redraw()
    commitChange()
  }

  return (
    <div>
      <button type="button" onClick={onExit}>
        ← メニューに戻る
      </button>
      <h2>ドット絵エディタ</h2>
      <div className="pixel-editor__workspace">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE}
          height={GRID_SIZE}
          style={{
            width: GRID_SIZE * DISPLAY_SCALE,
            height: GRID_SIZE * DISPLAY_SCALE,
            imageRendering: 'pixelated',
            border: '1px solid #ccc',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <div className="pixel-editor__palette">
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
              }}
              onClick={() => setSelectedValue(entry.value)}
            />
          ))}
        </div>
      </div>
      <div className="pixel-editor__actions">
        <button type="button" onClick={handleClear}>
          クリア
        </button>
        <button type="button" onClick={() => onStartLifeGame(code)}>
          この配置でライフゲームを開始
        </button>
      </div>
      <p>この配置のURL（共有・復元用、現在のアドレスバーにも反映されています）</p>
      <code className="pixel-editor__code">{code}</code>
    </div>
  )
}
