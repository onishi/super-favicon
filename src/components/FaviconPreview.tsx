import { forwardRef } from 'react'
import { GRID_SIZE } from '../lib/pixel-buffer'

const DISPLAY_SCALE = 8

export const FaviconPreview = forwardRef<HTMLCanvasElement>(function FaviconPreview(_props, ref) {
  return (
    <canvas
      ref={ref}
      width={GRID_SIZE}
      height={GRID_SIZE}
      style={{
        width: GRID_SIZE * DISPLAY_SCALE,
        height: GRID_SIZE * DISPLAY_SCALE,
        imageRendering: 'pixelated',
        border: '1px solid #ccc',
      }}
    />
  )
})
