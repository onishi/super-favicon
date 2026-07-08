import {
  ACCENT,
  CHARACTER_SIZE,
  GRID_SIZE,
  GROUND,
  GROUND_ALT,
  LOGICAL_GRID_SIZE,
  ON,
  ORANGE,
  setCharacter,
  setPixel,
} from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const GRAVITY = 0.15
const FLAP_STRENGTH = -1.2
const MAX_FALL_SPEED = 1.2
const CEILING_MARGIN = LOGICAL_GRID_SIZE / 2
const BIRD_X = 3
const BIRD_PHYSICAL_X = BIRD_X * CHARACTER_SIZE

const GAP_SIZE = 7
const PIPE_SPACING = 8
// Characters stay on the 2x2 grid, but the world scrolls in smooth 1-physical-pixel
// steps rather than jumping a full character width at a time.
const SCROLL_SPEED = 0.5

const GROUND_LOGICAL_HEIGHT = 1
const GROUND_TOP_Y = GRID_SIZE - GROUND_LOGICAL_HEIGHT * CHARACTER_SIZE
const GROUND_STRIPE_WIDTH = 4
const DEATH_Y = LOGICAL_GRID_SIZE - GROUND_LOGICAL_HEIGHT

interface Pipe {
  x: number // logical units (float — advances in physical-pixel-sized fractions)
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
    let blinkCounter = 0
    let groundOffset = 0
    let isGameOver = false
    let confirmWasPressed = false

    const reset = () => {
      birdY = LOGICAL_GRID_SIZE / 2
      velocity = 0
      pipes = [
        { x: LOGICAL_GRID_SIZE + PIPE_SPACING, gapStart: randomGapStart() },
        { x: LOGICAL_GRID_SIZE + PIPE_SPACING * 2, gapStart: randomGapStart() },
      ]
      blinkCounter = 0
      groundOffset = 0
      isGameOver = false
    }
    reset()

    const die = () => {
      isGameOver = true
      // Keep the bird visible where it died, even if it was off-screen above the ceiling.
      birdY = Math.max(0, Math.min(LOGICAL_GRID_SIZE - 1, birdY))
    }

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
        // Hitting the ceiling doesn't kill the bird — it just can't drift up forever.
        birdY = Math.max(birdY, -CEILING_MARGIN)

        if (birdY >= DEATH_Y) {
          die()
          return
        }

        groundOffset += SCROLL_SPEED
        for (const pipe of pipes) {
          pipe.x -= SCROLL_SPEED / CHARACTER_SIZE
          if (pipe.x < -1) {
            const maxX = Math.max(...pipes.map((p) => p.x))
            pipe.x = maxX + PIPE_SPACING
            pipe.gapStart = randomGapStart()
          }
        }

        const roundedBirdY = Math.round(birdY)
        const birdRight = BIRD_PHYSICAL_X + CHARACTER_SIZE - 1
        for (const pipe of pipes) {
          const wallLeft = Math.round(pipe.x * CHARACTER_SIZE)
          const wallRight = wallLeft + CHARACTER_SIZE - 1
          const overlapsX = wallRight >= BIRD_PHYSICAL_X && wallLeft <= birdRight
          if (overlapsX && (roundedBirdY < pipe.gapStart || roundedBirdY >= pipe.gapStart + GAP_SIZE)) {
            die()
            return
          }
        }
      },
      render: (buffer) => {
        for (const pipe of pipes) {
          const wallLeft = Math.round(pipe.x * CHARACTER_SIZE)
          if (wallLeft + CHARACTER_SIZE - 1 < 0 || wallLeft >= GRID_SIZE) continue
          for (let ly = 0; ly < LOGICAL_GRID_SIZE; ly++) {
            if (ly < pipe.gapStart || ly >= pipe.gapStart + GAP_SIZE) {
              for (let dx = 0; dx < CHARACTER_SIZE; dx++) {
                const px = wallLeft + dx
                if (px < 0 || px >= GRID_SIZE) continue
                for (let dy = 0; dy < CHARACTER_SIZE; dy++) {
                  setPixel(buffer, px, ly * CHARACTER_SIZE + dy, ACCENT)
                }
              }
            }
          }
        }

        // Ground strip with alternating stripes so scrolling is visible.
        const flooredGroundOffset = Math.floor(groundOffset) % (GROUND_STRIPE_WIDTH * 2)
        for (let x = 0; x < GRID_SIZE; x++) {
          const stripe = Math.floor((x + flooredGroundOffset) / GROUND_STRIPE_WIDTH) % 2 === 0 ? GROUND : GROUND_ALT
          for (let y = GROUND_TOP_Y; y < GRID_SIZE; y++) {
            setPixel(buffer, x, y, stripe)
          }
        }

        // Drawn last (on top) so the bird stays visible even where it died overlapping a pipe.
        const roundedBirdY = Math.round(birdY)
        // Above the ceiling is genuinely off-screen space; don't draw the bird there.
        if (roundedBirdY >= 0 && roundedBirdY < LOGICAL_GRID_SIZE) {
          setCharacter(buffer, BIRD_X, roundedBirdY, ORANGE)
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
