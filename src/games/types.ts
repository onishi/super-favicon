import type { InputState } from '../hooks/useInputState'
import type { PixelBuffer } from '../lib/pixel-buffer'

export interface GameInstance {
  update: (input: InputState) => void
  render: (buffer: PixelBuffer) => void
  getScore?: () => number
}

export interface GameDefinition {
  id: string
  name: string
  create: () => GameInstance
}
