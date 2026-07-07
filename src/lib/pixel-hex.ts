import { GRID_SIZE, createPixelBuffer, type PixelBuffer } from './pixel-buffer'

const TOTAL_BITS = GRID_SIZE * GRID_SIZE

export function pixelBufferToHex(buffer: PixelBuffer): string {
  let hex = ''
  for (let i = 0; i < TOTAL_BITS; i += 4) {
    const nibble =
      (buffer[i] ? 8 : 0) | (buffer[i + 1] ? 4 : 0) | (buffer[i + 2] ? 2 : 0) | (buffer[i + 3] ? 1 : 0)
    hex += nibble.toString(16)
  }
  return hex
}

export function hexToPixelBuffer(hex: string): PixelBuffer {
  const buffer = createPixelBuffer()
  for (let i = 0; i < TOTAL_BITS; i += 4) {
    const nibble = parseInt(hex[i / 4] ?? '0', 16) || 0
    buffer[i] = nibble & 8 ? 1 : 0
    buffer[i + 1] = nibble & 4 ? 1 : 0
    buffer[i + 2] = nibble & 2 ? 1 : 0
    buffer[i + 3] = nibble & 1 ? 1 : 0
  }
  return buffer
}
