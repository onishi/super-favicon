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
  // Most games render buffer values as the small set of semantic color
  // constants in lib/pixel-buffer.ts (ON, ACCENT, CYAN, ...), which is what
  // the shared glow post-processing and favicon renderer assume by default.
  // 'palette' opts a game out of both: buffer values are instead treated as
  // raw indices into the editor's 64-color RGB palette (lib/palette.ts), for
  // games that display imported/quantized artwork rather than sprites.
  colorMode?: 'semantic' | 'palette'
}
