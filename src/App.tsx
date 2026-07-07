import { useCallback, useRef } from 'react'
import {
  GRID_SIZE,
  clearPixelBuffer,
  createPixelBuffer,
  setPixel,
  type PixelBuffer,
} from './lib/pixel-buffer'
import { useFaviconLoop } from './hooks/useFaviconLoop'
import { useInputState } from './hooks/useInputState'
import { FaviconPreview } from './components/FaviconPreview'
import { TouchControls } from './components/TouchControls'

const CENTER = Math.floor(GRID_SIZE / 2)

function App() {
  const bufferRef = useRef<PixelBuffer>(createPixelBuffer())
  const positionRef = useRef({ x: CENTER, y: CENTER })
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const input = useInputState()

  const getBuffer = useCallback(() => {
    const buffer = bufferRef.current
    const position = positionRef.current
    clearPixelBuffer(buffer)

    if (input.isPressed('up')) position.y = Math.max(0, position.y - 1)
    if (input.isPressed('down')) position.y = Math.min(GRID_SIZE - 1, position.y + 1)
    if (input.isPressed('left')) position.x = Math.max(0, position.x - 1)
    if (input.isPressed('right')) position.x = Math.min(GRID_SIZE - 1, position.x + 1)
    if (input.isPressed('confirm')) {
      position.x = CENTER
      position.y = CENTER
    }

    setPixel(buffer, position.x, position.y, 1)
    return buffer
  }, [input])

  useFaviconLoop(getBuffer, { fps: 12, previewCanvasRef })

  return (
    <main>
      <h1>SUPER-FAVICON</h1>
      <p>
        カーソルキー / WASD で移動、Space か Enter で中央に戻ります。Mobile
        では下の十字＋1ボタンを使ってください。
      </p>
      <FaviconPreview ref={previewCanvasRef} />
      <TouchControls input={input} />
    </main>
  )
}

export default App
