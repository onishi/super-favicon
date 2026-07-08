import { ACCENT, GRID_SIZE, LOGICAL_GRID_SIZE, ON, setCharacter, setPixel } from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const STEP_INTERVAL = 4
const INITIAL_LENGTH = 3

type Direction = 'up' | 'down' | 'left' | 'right'

interface Vec {
  x: number
  y: number
}

const DIRECTION_VECTORS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

function randomEmptyCell(occupied: Set<string>): Vec {
  let cell: Vec
  do {
    cell = {
      x: Math.floor(Math.random() * LOGICAL_GRID_SIZE),
      y: Math.floor(Math.random() * LOGICAL_GRID_SIZE),
    }
  } while (occupied.has(`${cell.x},${cell.y}`))
  return cell
}

export const snakeGame: GameDefinition = {
  id: 'snake',
  name: 'スネークゲーム',
  create: () => {
    let snake: Vec[]
    let direction: Direction
    let pendingDirection: Direction
    let food: Vec
    let frameCount = 0
    let blinkCounter = 0
    let score = 0
    let isGameOver = false
    let confirmWasPressed = false

    const reset = () => {
      const startX = Math.floor(LOGICAL_GRID_SIZE / 2)
      const startY = Math.floor(LOGICAL_GRID_SIZE / 2)
      snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ x: startX - i, y: startY }))
      direction = 'right'
      pendingDirection = 'right'
      food = randomEmptyCell(new Set(snake.map((s) => `${s.x},${s.y}`)))
      frameCount = 0
      blinkCounter = 0
      score = 0
      isGameOver = false
    }
    reset()

    return {
      update: (input) => {
        const confirmPressed = input.isPressed('confirm')

        if (isGameOver) {
          blinkCounter += 1
          if (confirmPressed && !confirmWasPressed) reset()
          confirmWasPressed = confirmPressed
          return
        }
        confirmWasPressed = confirmPressed

        for (const candidate of ALL_DIRECTIONS) {
          if (input.isPressed(candidate) && candidate !== OPPOSITE[direction]) {
            pendingDirection = candidate
            break
          }
        }

        frameCount += 1
        if (frameCount < STEP_INTERVAL) return
        frameCount = 0

        direction = pendingDirection
        const head = snake[0]
        const vector = DIRECTION_VECTORS[direction]
        const newHead = { x: head.x + vector.x, y: head.y + vector.y }

        if (
          newHead.x < 0 ||
          newHead.x >= LOGICAL_GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= LOGICAL_GRID_SIZE
        ) {
          isGameOver = true
          return
        }

        const ateFood = newHead.x === food.x && newHead.y === food.y
        const bodyToCheck = ateFood ? snake : snake.slice(0, -1)
        if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
          isGameOver = true
          return
        }

        snake.unshift(newHead)
        if (ateFood) {
          score += 1
          food = randomEmptyCell(new Set(snake.map((s) => `${s.x},${s.y}`)))
        } else {
          snake.pop()
        }
      },
      render: (buffer) => {
        for (const segment of snake) setCharacter(buffer, segment.x, segment.y, ON)
        setCharacter(buffer, food.x, food.y, ACCENT)

        if (isGameOver && Math.floor(blinkCounter / 4) % 2 === 0) {
          for (let i = 0; i < GRID_SIZE; i++) {
            setPixel(buffer, i, 0, ON)
            setPixel(buffer, i, GRID_SIZE - 1, ON)
            setPixel(buffer, 0, i, ON)
            setPixel(buffer, GRID_SIZE - 1, i, ON)
          }
        }
      },
      getScore: () => score,
    }
  },
}
