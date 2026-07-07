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
