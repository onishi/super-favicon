import { useEffect, useRef, type RefObject } from 'react'
import type { PixelBuffer } from '../lib/pixel-buffer'
import {
  renderPixelBufferToCanvas,
  updateFaviconLink,
  type FaviconRendererOptions,
} from '../lib/favicon-renderer'

export interface UseFaviconLoopOptions extends FaviconRendererOptions {
  fps?: number
  previewCanvasRef?: RefObject<HTMLCanvasElement | null>
}

export function useFaviconLoop(
  getBuffer: () => PixelBuffer,
  options: UseFaviconLoopOptions = {},
): void {
  const { fps = 8, onColor = '#000000', offColor = null, previewCanvasRef } = options
  const faviconCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!faviconCanvasRef.current) {
      faviconCanvasRef.current = document.createElement('canvas')
    }
    const faviconCanvas = faviconCanvasRef.current
    const interval = 1000 / fps
    let lastTime = 0
    let rafId: number

    const tick = (time: number) => {
      rafId = requestAnimationFrame(tick)
      if (time - lastTime < interval) return
      lastTime = time

      const buffer = getBuffer()
      renderPixelBufferToCanvas(buffer, faviconCanvas, { onColor, offColor })
      updateFaviconLink(faviconCanvas)

      if (previewCanvasRef?.current) {
        renderPixelBufferToCanvas(buffer, previewCanvasRef.current, { onColor, offColor })
      }
    }
    rafId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafId)
  }, [getBuffer, fps, onColor, offColor, previewCanvasRef])
}
