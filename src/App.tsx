import { useCallback, useRef } from 'react'
import {
  GRID_SIZE,
  clearPixelBuffer,
  createPixelBuffer,
  setPixel,
  type PixelBuffer,
} from './lib/pixel-buffer'
import { useFaviconLoop } from './hooks/useFaviconLoop'
import { FaviconPreview } from './components/FaviconPreview'

function App() {
  const bufferRef = useRef<PixelBuffer>(createPixelBuffer())
  const positionRef = useRef({ x: 4, y: 4, dx: 1, dy: 1 })
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const getBuffer = useCallback(() => {
    const buffer = bufferRef.current
    const position = positionRef.current
    clearPixelBuffer(buffer)

    position.x += position.dx
    position.y += position.dy
    if (position.x <= 0 || position.x >= GRID_SIZE - 1) position.dx *= -1
    if (position.y <= 0 || position.y >= GRID_SIZE - 1) position.dy *= -1

    setPixel(buffer, position.x, position.y, 1)
    return buffer
  }, [])

  useFaviconLoop(getBuffer, { fps: 8, previewCanvasRef })

  return (
    <main>
      <h1>SUPER-FAVICON</h1>
      <p>
        タブの Favicon を見てください。Mobile など Favicon が見えない環境向けに、同じ画面をここにも表示しています。
      </p>
      <FaviconPreview ref={previewCanvasRef} />
    </main>
  )
}

export default App
