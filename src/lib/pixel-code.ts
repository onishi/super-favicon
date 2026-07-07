import { GRID_SIZE, createPixelBuffer, type PixelBuffer } from './pixel-buffer'

const TOTAL_PIXELS = GRID_SIZE * GRID_SIZE

// URL-safe alphabet (base64url charset) — one character encodes one pixel's
// palette value (0-63), so an RGB-4x4x4 (64 color) palette fits exactly.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function pixelBufferToCode(buffer: PixelBuffer): string {
  let code = ''
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    code += ALPHABET[buffer[i] % ALPHABET.length]
  }
  return code
}

export function codeToPixelBuffer(code: string): PixelBuffer {
  const buffer = createPixelBuffer()
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    const value = ALPHABET.indexOf(code[i] ?? '')
    buffer[i] = value === -1 ? 0 : value
  }
  return buffer
}
