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
  render?: (buffer: PixelBuffer, canvas: HTMLCanvasElement) => void
}

export function useFaviconLoop(
  getBuffer: () => PixelBuffer,
  options: UseFaviconLoopOptions = {},
): void {
  const {
    fps = 8,
    onColor = '#ffffff',
    offColor = '#000000',
    accentColor = '#00ff00',
    redColor = '#ff0000',
    glowOnColor = '#555555',
    glowAccentColor = '#005500',
    glowRedColor = '#550000',
    groundColor = '#c8a878',
    groundAltColor = '#a8845a',
    previewCanvasRef,
    render,
  } = options
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
      const colorOptions = {
        onColor,
        offColor,
        accentColor,
        redColor,
        glowOnColor,
        glowAccentColor,
        glowRedColor,
        groundColor,
        groundAltColor,
      }
      const draw = render ?? ((b: PixelBuffer, c: HTMLCanvasElement) => renderPixelBufferToCanvas(b, c, colorOptions))
      draw(buffer, faviconCanvas)
      updateFaviconLink(faviconCanvas)

      if (previewCanvasRef?.current) {
        draw(buffer, previewCanvasRef.current)
      }
    }
    rafId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafId)
  }, [
    getBuffer,
    fps,
    onColor,
    offColor,
    accentColor,
    redColor,
    glowOnColor,
    glowAccentColor,
    glowRedColor,
    groundColor,
    groundAltColor,
    previewCanvasRef,
    render,
  ])
}
