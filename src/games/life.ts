import { getPixelsHexFromLocation } from '../lib/editor-url'
import { CHARACTER_SIZE, GRID_SIZE, LOGICAL_GRID_SIZE, ON, setCharacter, type PixelBuffer } from '../lib/pixel-buffer'
import { hexToPixelBuffer } from '../lib/pixel-hex'
import { GLIDER, PULSAR, type Pattern } from './life/patterns'
import { createGrid, placePattern, step } from './life/rules'
import type { GameDefinition } from './types'

const STEP_INTERVAL = 3

function randomPattern(fillRatio = 0.3): Pattern {
  const cells: Pattern = []
  for (let y = 0; y < LOGICAL_GRID_SIZE; y++) {
    for (let x = 0; x < LOGICAL_GRID_SIZE; x++) {
      if (Math.random() < fillRatio) cells.push([x, y])
    }
  }
  return cells
}

function downsampleToLogicalGrid(buffer: PixelBuffer): Uint8Array {
  const grid = createGrid()
  for (let ly = 0; ly < LOGICAL_GRID_SIZE; ly++) {
    for (let lx = 0; lx < LOGICAL_GRID_SIZE; lx++) {
      let alive = 0
      for (let dy = 0; dy < CHARACTER_SIZE; dy++) {
        for (let dx = 0; dx < CHARACTER_SIZE; dx++) {
          const px = lx * CHARACTER_SIZE + dx
          const py = ly * CHARACTER_SIZE + dy
          if (buffer[py * GRID_SIZE + px]) alive = 1
        }
      }
      grid[ly * LOGICAL_GRID_SIZE + lx] = alive
    }
  }
  return grid
}

interface Preset {
  name: string
  pattern: () => Pattern
  offsetX: number
  offsetY: number
}

const PRESETS: Preset[] = [
  { name: 'グライダー', pattern: () => GLIDER, offsetX: 2, offsetY: 2 },
  { name: 'パルサー', pattern: () => PULSAR, offsetX: 1, offsetY: 1 },
  { name: 'ランダム', pattern: () => randomPattern(), offsetX: 0, offsetY: 0 },
]

export const lifeGame: GameDefinition = {
  id: 'life',
  name: 'ライフゲーム',
  create: () => {
    const initialHex = getPixelsHexFromLocation()
    const hasCustomPattern = initialHex !== null

    let presetIndex = hasCustomPattern ? -1 : 0
    let grid = hasCustomPattern ? downsampleToLogicalGrid(hexToPixelBuffer(initialHex)) : createGrid()
    let frameCount = 0
    let confirmWasPressed = false

    const loadPreset = (index: number) => {
      grid = createGrid()
      const preset = PRESETS[index]
      placePattern(grid, preset.pattern(), preset.offsetX, preset.offsetY)
    }
    if (!hasCustomPattern) loadPreset(presetIndex)

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
        for (let y = 0; y < LOGICAL_GRID_SIZE; y++) {
          for (let x = 0; x < LOGICAL_GRID_SIZE; x++) {
            if (grid[y * LOGICAL_GRID_SIZE + x]) setCharacter(buffer, x, y, ON)
          }
        }
      },
    }
  },
}
