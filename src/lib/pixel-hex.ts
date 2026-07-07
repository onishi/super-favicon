import { GRID_SIZE, createPixelBuffer, type PixelBuffer } from './pixel-buffer'

const TOTAL_PIXELS = GRID_SIZE * GRID_SIZE

export function pixelBufferToHex(buffer: PixelBuffer): string {
  let hex = ''
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    hex += (buffer[i] & 0xf).toString(16)
  }
  return hex
}

export function hexToPixelBuffer(hex: string): PixelBuffer {
  const buffer = createPixelBuffer()
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    buffer[i] = parseInt(hex[i] ?? '0', 16) || 0
  }
  return buffer
}
