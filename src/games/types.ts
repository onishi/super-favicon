import type { InputState } from '../hooks/useInputState'
import type { PixelBuffer } from '../lib/pixel-buffer'

export interface GameInstance {
  update: (input: InputState) => void
  render: (buffer: PixelBuffer) => void
  getScore?: () => number
  // Overrides the default "[score] name" title with a custom label (e.g. "3:00"),
  // for instances where a plain number doesn't represent the state well.
  getStatusText?: () => string
}

export interface GameDefinition {
  id: string
  name: string
  create: () => GameInstance
}
