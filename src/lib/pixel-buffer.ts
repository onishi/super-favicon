export const GRID_SIZE = 32

export const CHARACTER_SIZE = 2
export const LOGICAL_GRID_SIZE = GRID_SIZE / CHARACTER_SIZE

export const OFF = 0
export const ON = 1
export const ACCENT = 2
export const ORANGE = 3
export const GLOW_ON = 4
export const GLOW_ACCENT = 5
export const GLOW_ORANGE = 6
export const GROUND = 7
export const GROUND_ALT = 8
export const CYAN = 9
export const YELLOW = 10
export const PURPLE = 11
export const RED = 12
export const BLUE = 13
export const GLOW_CYAN = 14
export const GLOW_YELLOW = 15
export const GLOW_PURPLE = 16
export const GLOW_RED = 17
export const GLOW_BLUE = 18

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

export function fillRect(
  buffer: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: number,
): void {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      setPixel(buffer, x, y, value)
    }
  }
}

export function floodFill(buffer: PixelBuffer, startX: number, startY: number, value: number): void {
  const targetValue = getPixel(buffer, startX, startY)
  if (targetValue === value) return

  const stack: Array<[number, number]> = [[startX, startY]]
  while (stack.length > 0) {
    const [x, y] = stack.pop() as [number, number]
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue
    if (buffer[y * GRID_SIZE + x] !== targetValue) continue
    buffer[y * GRID_SIZE + x] = value
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
}

const GLOW_NEIGHBOR_OFFSETS: Array<[number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
]

const GLOW_VALUE_BY_SOLID_VALUE: Record<number, number> = {
  [ON]: GLOW_ON,
  [ACCENT]: GLOW_ACCENT,
  [ORANGE]: GLOW_ORANGE,
  [CYAN]: GLOW_CYAN,
  [YELLOW]: GLOW_YELLOW,
  [PURPLE]: GLOW_PURPLE,
  [RED]: GLOW_RED,
  [BLUE]: GLOW_BLUE,
}

export function applyGlow(buffer: PixelBuffer): void {
  const snapshot = buffer.slice()
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const value = snapshot[y * GRID_SIZE + x]
      const glowValue = GLOW_VALUE_BY_SOLID_VALUE[value]
      if (glowValue === undefined) continue

      for (const [dx, dy] of GLOW_NEIGHBOR_OFFSETS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue
        const index = ny * GRID_SIZE + nx
        if (snapshot[index] === OFF && buffer[index] === OFF) {
          buffer[index] = glowValue
        }
      }
    }
  }
}
