import { GRID_SIZE, LOGICAL_GRID_SIZE, ON, setCharacter, setPixel } from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const GRAVITY = 0.15
const FLAP_STRENGTH = -1.2
const MAX_FALL_SPEED = 1.2
const BIRD_X = 3

const GAP_SIZE = 4
const PIPE_SPACING = 8
const PIPE_STEP_INTERVAL = 4

interface Pipe {
  x: number
  gapStart: number
}

function randomGapStart(): number {
  return 1 + Math.floor(Math.random() * (LOGICAL_GRID_SIZE - GAP_SIZE - 2))
}

export const flappyGame: GameDefinition = {
  id: 'flappy',
  name: 'フラッピーバード',
  create: () => {
    let birdY: number
    let velocity: number
    let pipes: Pipe[]
    let frameCount = 0
    let blinkCounter = 0
    let isGameOver = false
    let confirmWasPressed = false

    const reset = () => {
      birdY = LOGICAL_GRID_SIZE / 2
      velocity = 0
      pipes = [
        { x: LOGICAL_GRID_SIZE + PIPE_SPACING, gapStart: randomGapStart() },
        { x: LOGICAL_GRID_SIZE + PIPE_SPACING * 2, gapStart: randomGapStart() },
      ]
      frameCount = 0
      blinkCounter = 0
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

        if (confirmPressed && !confirmWasPressed) {
          velocity = FLAP_STRENGTH
        }
        confirmWasPressed = confirmPressed

        velocity = Math.min(MAX_FALL_SPEED, velocity + GRAVITY)
        birdY += velocity

        if (birdY < 0 || birdY >= LOGICAL_GRID_SIZE) {
          isGameOver = true
          return
        }

        frameCount += 1
        if (frameCount >= PIPE_STEP_INTERVAL) {
          frameCount = 0
          for (const pipe of pipes) {
            pipe.x -= 1
            if (pipe.x < -1) {
              const maxX = Math.max(...pipes.map((p) => p.x))
              pipe.x = maxX + PIPE_SPACING
              pipe.gapStart = randomGapStart()
            }
          }
        }

        const roundedBirdY = Math.round(birdY)
        for (const pipe of pipes) {
          if (pipe.x === BIRD_X && (roundedBirdY < pipe.gapStart || roundedBirdY >= pipe.gapStart + GAP_SIZE)) {
            isGameOver = true
            return
          }
        }
      },
      render: (buffer) => {
        const roundedBirdY = Math.max(0, Math.min(LOGICAL_GRID_SIZE - 1, Math.round(birdY)))
        setCharacter(buffer, BIRD_X, roundedBirdY, ON)

        for (const pipe of pipes) {
          if (pipe.x < 0 || pipe.x >= LOGICAL_GRID_SIZE) continue
          for (let y = 0; y < LOGICAL_GRID_SIZE; y++) {
            if (y < pipe.gapStart || y >= pipe.gapStart + GAP_SIZE) {
              setCharacter(buffer, pipe.x, y, ON)
            }
          }
        }

        if (isGameOver && Math.floor(blinkCounter / 4) % 2 === 0) {
          for (let i = 0; i < GRID_SIZE; i++) {
            setPixel(buffer, i, 0, ON)
            setPixel(buffer, i, GRID_SIZE - 1, ON)
            setPixel(buffer, 0, i, ON)
            setPixel(buffer, GRID_SIZE - 1, i, ON)
          }
        }
      },
    }
  },
}
