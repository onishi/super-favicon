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
const PIPE_SPACING_PHYSICAL = 8 * CHARACTER_SIZE
// Characters stay on the 2x2 grid, but the world scrolls in whole 1-physical-pixel
// steps rather than jumping a full character width at a time. Both the ground and
// the pipes advance from the same integer tick counter so they can never drift out
// of sync with each other (no floating point rounding involved).
const SCROLL_TICK_INTERVAL = 2

const GROUND_LOGICAL_HEIGHT = 1
const GROUND_TOP_Y = GRID_SIZE - GROUND_LOGICAL_HEIGHT * CHARACTER_SIZE
const GROUND_STRIPE_WIDTH = 4
const DEATH_Y = LOGICAL_GRID_SIZE - GROUND_LOGICAL_HEIGHT

interface Pipe {
  x: number // physical pixel position of the wall's left edge (integer)
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
    let scrollFrameCount = 0
    let blinkCounter = 0
    let groundOffset = 0
    let isGameOver = false
    let confirmWasPressed = false

    const reset = () => {
      birdY = LOGICAL_GRID_SIZE / 2
      velocity = 0
      pipes = [
        { x: GRID_SIZE + PIPE_SPACING_PHYSICAL, gapStart: randomGapStart() },
        { x: GRID_SIZE + PIPE_SPACING_PHYSICAL * 2, gapStart: randomGapStart() },
      ]
      scrollFrameCount = 0
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

        scrollFrameCount += 1
        if (scrollFrameCount >= SCROLL_TICK_INTERVAL) {
          scrollFrameCount = 0
          groundOffset = (groundOffset + 1) % (GROUND_STRIPE_WIDTH * 2)
          for (const pipe of pipes) {
            pipe.x -= 1
            if (pipe.x < -CHARACTER_SIZE) {
              const maxX = Math.max(...pipes.map((p) => p.x))
              pipe.x = maxX + PIPE_SPACING_PHYSICAL
              pipe.gapStart = randomGapStart()
            }
          }
        }

        const roundedBirdY = Math.round(birdY)
        const birdRight = BIRD_PHYSICAL_X + CHARACTER_SIZE - 1
        for (const pipe of pipes) {
          const wallRight = pipe.x + CHARACTER_SIZE - 1
          const overlapsX = wallRight >= BIRD_PHYSICAL_X && pipe.x <= birdRight
          if (overlapsX && (roundedBirdY < pipe.gapStart || roundedBirdY >= pipe.gapStart + GAP_SIZE)) {
            die()
            return
          }
        }
      },
      render: (buffer) => {
        for (const pipe of pipes) {
          if (pipe.x + CHARACTER_SIZE - 1 < 0 || pipe.x >= GRID_SIZE) continue
          for (let ly = 0; ly < LOGICAL_GRID_SIZE; ly++) {
            if (ly < pipe.gapStart || ly >= pipe.gapStart + GAP_SIZE) {
              for (let dx = 0; dx < CHARACTER_SIZE; dx++) {
                const px = pipe.x + dx
                if (px < 0 || px >= GRID_SIZE) continue
                for (let dy = 0; dy < CHARACTER_SIZE; dy++) {
                  setPixel(buffer, px, ly * CHARACTER_SIZE + dy, ACCENT)
                }
              }
            }
          }
        }

        // Ground strip with alternating stripes so scrolling is visible.
        for (let x = 0; x < GRID_SIZE; x++) {
          const stripe = Math.floor((x + groundOffset) / GROUND_STRIPE_WIDTH) % 2 === 0 ? GROUND : GROUND_ALT
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
