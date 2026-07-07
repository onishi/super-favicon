export interface PaletteColor {
  value: number
  color: string
  label: string
}

export const OFF_COLOR = '#000000'

export const PALETTE: PaletteColor[] = [
  { value: 1, color: '#ffffff', label: '白' },
  { value: 2, color: '#ff0000', label: '赤' },
  { value: 3, color: '#00ff00', label: '緑' },
  { value: 4, color: '#0000ff', label: '青' },
  { value: 5, color: '#ffff00', label: '黄' },
  { value: 6, color: '#00ffff', label: 'シアン' },
  { value: 7, color: '#ff00ff', label: 'マゼンタ' },
]

export function colorForValue(value: number): string {
  return PALETTE.find((entry) => entry.value === value)?.color ?? OFF_COLOR
}
