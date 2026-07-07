import { GRID_SIZE, setPixel } from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

export const blinkDemoGame: GameDefinition = {
  id: 'blink-demo',
  name: 'デモ: 点滅',
  create: () => {
    let frame = 0
    return {
      update: () => {
        frame += 1
      },
      render: (buffer) => {
        const isOn = Math.floor(frame / 4) % 2 === 0
        if (!isOn) return
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if ((x + y) % 4 === 0) setPixel(buffer, x, y, 1)
          }
        }
      },
    }
  },
}
