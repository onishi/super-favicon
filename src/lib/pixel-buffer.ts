export const GRID_SIZE = 32

export const CHARACTER_SIZE = 2
export const LOGICAL_GRID_SIZE = GRID_SIZE / CHARACTER_SIZE

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

export function setCharacter(buffer: PixelBuffer, logicalX: number, logicalY: number, value: number): void {
  const baseX = logicalX * CHARACTER_SIZE
  const baseY = logicalY * CHARACTER_SIZE
  for (let dy = 0; dy < CHARACTER_SIZE; dy++) {
    for (let dx = 0; dx < CHARACTER_SIZE; dx++) {
      setPixel(buffer, baseX + dx, baseY + dy, value)
    }
  }
}
