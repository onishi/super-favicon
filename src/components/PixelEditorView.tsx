import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { getPixelsHexFromLocation, setPixelsHexInLocation } from '../lib/editor-url'
import { renderPixelBufferToCanvas } from '../lib/favicon-renderer'
import {
  GRID_SIZE,
  clearPixelBuffer,
  createPixelBuffer,
  getPixel,
  setPixel,
  type PixelBuffer,
} from '../lib/pixel-buffer'
import { hexToPixelBuffer, pixelBufferToHex } from '../lib/pixel-hex'

const DISPLAY_SCALE = 8

interface PixelEditorViewProps {
  onExit: () => void
  onStartLifeGame: (pixelsHex: string) => void
}

function getCellFromPointer(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const relX = (event.clientX - rect.left) / rect.width
  const relY = (event.clientY - rect.top) / rect.height
  const x = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(relX * GRID_SIZE)))
  const y = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(relY * GRID_SIZE)))
  return { x, y }
}

export function PixelEditorView({ onExit, onStartLifeGame }: PixelEditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<PixelBuffer | null>(null)
  const isDrawingRef = useRef(false)
  const paintValueRef = useRef(1)

  if (!bufferRef.current) {
    const initialHex = getPixelsHexFromLocation()
    bufferRef.current = initialHex ? hexToPixelBuffer(initialHex) : createPixelBuffer()
  }

  const [hex, setHex] = useState(() => pixelBufferToHex(bufferRef.current as PixelBuffer))

  const redraw = useCallback(() => {
    if (canvasRef.current && bufferRef.current) {
      renderPixelBufferToCanvas(bufferRef.current, canvasRef.current, {
        onColor: '#ffffff',
        offColor: '#000000',
      })
    }
  }, [])

  useEffect(() => {
    redraw()
  }, [redraw])

  const commitChange = useCallback(() => {
    const nextHex = pixelBufferToHex(bufferRef.current as PixelBuffer)
    setHex(nextHex)
    setPixelsHexInLocation(nextHex)
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
    paintValueRef.current = getPixel(bufferRef.current as PixelBuffer, x, y) ? 0 : 1
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
      <div className="pixel-editor__actions">
        <button type="button" onClick={handleClear}>
          クリア
        </button>
        <button type="button" onClick={() => onStartLifeGame(hex)}>
          この配置でライフゲームを開始
        </button>
      </div>
      <p>この配置のURL（共有・復元用、現在のアドレスバーにも反映されています）</p>
      <code className="pixel-editor__hex">{hex}</code>
    </div>
  )
}
