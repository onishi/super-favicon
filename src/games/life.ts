import { GRID_SIZE } from '../lib/pixel-buffer'
import { GLIDER, PULSAR, type Pattern } from './life/patterns'
import { createGrid, placePattern, step } from './life/rules'
import type { GameDefinition } from './types'

const STEP_INTERVAL = 3

function randomPattern(fillRatio = 0.3): Pattern {
  const cells: Pattern = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (Math.random() < fillRatio) cells.push([x, y])
    }
  }
  return cells
}

interface Preset {
  name: string
  pattern: () => Pattern
  offsetX: number
  offsetY: number
}

const PRESETS: Preset[] = [
  { name: 'グライダー', pattern: () => GLIDER, offsetX: 4, offsetY: 4 },
  { name: 'パルサー', pattern: () => PULSAR, offsetX: 9, offsetY: 9 },
  { name: 'ランダム', pattern: () => randomPattern(), offsetX: 0, offsetY: 0 },
]

export const lifeGame: GameDefinition = {
  id: 'life',
  name: 'ライフゲーム',
  create: () => {
    let presetIndex = 0
    let grid = createGrid()
    let frameCount = 0
    let confirmWasPressed = false

    const loadPreset = (index: number) => {
      grid = createGrid()
      const preset = PRESETS[index]
      placePattern(grid, preset.pattern(), preset.offsetX, preset.offsetY)
    }
    loadPreset(presetIndex)

    return {
      update: (input) => {
        const confirmPressed = input.isPressed('confirm')
        if (confirmPressed && !confirmWasPressed) {
          presetIndex = (presetIndex + 1) % PRESETS.length
          loadPreset(presetIndex)
          frameCount = 0
        }
        confirmWasPressed = confirmPressed

        frameCount += 1
        if (frameCount >= STEP_INTERVAL) {
          frameCount = 0
          grid = step(grid)
        }
      },
      render: (buffer) => {
        buffer.set(grid)
      },
    }
  },
}
