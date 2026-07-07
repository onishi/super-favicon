export const GRID_SIZE = 32

export type PixelBuffer = Uint8Array

export function createPixelBuffer(): PixelBuffer {
  return new Uint8Array(GRID_SIZE * GRID_SIZE)
}

function assertInBounds(x: number, y: number): void {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
    throw new RangeError(`out of bounds: (${x}, ${y})`)
  }
}

export function getPixel(buffer: PixelBuffer, x: number, y: number): number {
  assertInBounds(x, y)
  return buffer[y * GRID_SIZE + x]
}

export function setPixel(buffer: PixelBuffer, x: number, y: number, value: number): void {
  assertInBounds(x, y)
  buffer[y * GRID_SIZE + x] = value
}

export function clearPixelBuffer(buffer: PixelBuffer): void {
  buffer.fill(0)
}
