import { GRID_SIZE, type PixelBuffer } from './pixel-buffer'

export interface PaletteColor {
  value: number
  color: string
  label: string
}

export const OFF_COLOR = '#000000'

const LEVELS = [0, 85, 170, 255]
const LEVEL_COUNT = LEVELS.length

export function colorForValue(value: number): string {
  const r = Math.floor(value / (LEVEL_COUNT * LEVEL_COUNT)) % LEVEL_COUNT
  const g = Math.floor(value / LEVEL_COUNT) % LEVEL_COUNT
  const b = value % LEVEL_COUNT
  return `rgb(${LEVELS[r]}, ${LEVELS[g]}, ${LEVELS[b]})`
}

export const PALETTE: PaletteColor[] = Array.from({ length: LEVEL_COUNT ** 3 }, (_, value) => {
  const r = Math.floor(value / (LEVEL_COUNT * LEVEL_COUNT)) % LEVEL_COUNT
  const g = Math.floor(value / LEVEL_COUNT) % LEVEL_COUNT
  const b = value % LEVEL_COUNT
  return { value, color: colorForValue(value), label: `R${r}G${g}B${b}` }
})

export function renderPaletteBufferToCanvas(buffer: PixelBuffer, canvas: HTMLCanvasElement): void {
  canvas.width = GRID_SIZE
  canvas.height = GRID_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = OFF_COLOR
  ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE)
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const value = buffer[y * GRID_SIZE + x]
      if (value !== 0) {
        ctx.fillStyle = colorForValue(value)
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}
