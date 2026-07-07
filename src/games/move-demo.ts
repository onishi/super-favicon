import { GRID_SIZE, setPixel } from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const CENTER = Math.floor(GRID_SIZE / 2)

export const moveDemoGame: GameDefinition = {
  id: 'move-demo',
  name: 'デモ: 移動',
  create: () => {
    const position = { x: CENTER, y: CENTER }
    return {
      update: (input) => {
        if (input.isPressed('up')) position.y = Math.max(0, position.y - 1)
        if (input.isPressed('down')) position.y = Math.min(GRID_SIZE - 1, position.y + 1)
        if (input.isPressed('left')) position.x = Math.max(0, position.x - 1)
        if (input.isPressed('right')) position.x = Math.min(GRID_SIZE - 1, position.x + 1)
        if (input.isPressed('confirm')) {
          position.x = CENTER
          position.y = CENTER
        }
      },
      render: (buffer) => {
        setPixel(buffer, position.x, position.y, 1)
      },
    }
  },
}
