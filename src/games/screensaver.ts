import { GRID_SIZE, type PixelBuffer } from '../lib/pixel-buffer'
import { codeToPixelBuffer } from '../lib/pixel-code'
import { SCREENSAVER_ARTWORK_CODES } from './screensaver-art'
import type { GameDefinition } from './types'

const CELL_COUNT = GRID_SIZE * GRID_SIZE

// At the favicon loop's 12fps: ~5s fully shown, then a ~1.5s dissolve into
// the next artwork (classic screensaver-style transition, adapted as a
// per-pixel random reveal to fit the dot-art medium).
const DISPLAY_TICKS = 60
const TRANSITION_TICKS = 18

const ARTWORKS = SCREENSAVER_ARTWORK_CODES.map((code) => codeToPixelBuffer(code))

type Phase = 'display' | 'transition'

function shuffledCellOrder(): number[] {
  const order = Array.from({ length: CELL_COUNT }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export const screensaverGame: GameDefinition = {
  id: 'screensaver',
  name: 'ドットセーバー',
  colorMode: 'palette',
  create: () => {
    let currentIndex = 0
    let phase: Phase = 'display'
    let ticks = 0
    let revealOrder = shuffledCellOrder()
    let revealedCount = 0
    let confirmWasPressed = false

    const startTransitionToNext = () => {
      currentIndex = (currentIndex + 1) % ARTWORKS.length
      phase = 'transition'
      ticks = 0
      revealOrder = shuffledCellOrder()
      revealedCount = 0
    }

    return {
      update: (input) => {
        const confirmPressed = input.isPressed('confirm')
        const skipRequested = confirmPressed && !confirmWasPressed
        confirmWasPressed = confirmPressed

        ticks += 1
        if (phase === 'display') {
          if (skipRequested || ticks >= DISPLAY_TICKS) startTransitionToNext()
          return
        }

        revealedCount = Math.min(CELL_COUNT, Math.ceil((ticks / TRANSITION_TICKS) * CELL_COUNT))
        if (ticks >= TRANSITION_TICKS) {
          phase = 'display'
          ticks = 0
        }
      },
      render: (buffer: PixelBuffer) => {
        const target = ARTWORKS[currentIndex]
        if (phase === 'display') {
          buffer.set(target)
          return
        }

        const previous = ARTWORKS[(currentIndex - 1 + ARTWORKS.length) % ARTWORKS.length]
        buffer.set(previous)
        for (let i = 0; i < revealedCount; i++) {
          const cell = revealOrder[i]
          buffer[cell] = target[cell]
        }
      },
    }
  },
}
