import {
  ACCENT,
  BLUE,
  CHARACTER_SIZE,
  GRID_SIZE,
  LOGICAL_GRID_SIZE,
  ON,
  RED,
  setCharacter,
  setPixel,
  YELLOW,
} from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const FIELD_WIDTH = 6
const FIELD_HEIGHT = LOGICAL_GRID_SIZE
// Narrower than tetris's field, so it's centered rather than pushed to one
// side; the next-piece preview lives in the leftover space on the right.
const FIELD_OFFSET_X = Math.floor((LOGICAL_GRID_SIZE - FIELD_WIDTH) / 2)

const FIELD_LEFT_BORDER_X = FIELD_OFFSET_X * CHARACTER_SIZE - 1
const FIELD_RIGHT_BORDER_X = (FIELD_OFFSET_X + FIELD_WIDTH) * CHARACTER_SIZE

const NEXT_PREVIEW_X = FIELD_OFFSET_X + FIELD_WIDTH + 2
const NEXT_PREVIEW_Y = 2

const GRAVITY_INTERVAL = 16
const SOFT_DROP_INTERVAL = 2
const MOVE_REPEAT_INTERVAL = 5

const CLEAR_THRESHOLD = 4
// How long a cluster flashes before it's actually removed from the grid, so
// chains read as a sequence of distinct pops rather than one instant clear.
const POP_EFFECT_DURATION = 10
const POP_FLASH_INTERVAL = 2

// A puyo pair is a pivot cell plus a second cell attached in one of 4
// directions, cycling clockwise as it rotates: up, right, down, left.
const ROTATION_OFFSETS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

const PUYO_COLORS = [RED, BLUE, YELLOW, ACCENT]
const randomColor = (): number => PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)]

const SPAWN_X = Math.floor((FIELD_WIDTH - 1) / 2)
const SPAWN_Y = 1

export const puyoGame: GameDefinition = {
  id: 'puyo',
  name: 'ぷよぷよ',
  create: () => {
    let grid: Uint8Array
    let pivotX: number
    let pivotY: number
    let rotation: number
    let pivotColor: number
    let secondColor: number
    let nextPivotColor: number
    let nextSecondColor: number
    let gravityFrameCount = 0
    let leftRepeatCount = 0
    let rightRepeatCount = 0
    let leftWasPressed = false
    let rightWasPressed = false
    let rotateWasPressed = false
    let confirmWasPressed = false
    let blinkCounter = 0
    let score = 0
    let isGameOver = false
    let isResolving = false
    let poppingCells: Array<[number, number]> = []
    let poppingFrameCount = 0
    let resolveChain = 0

    const secondCellOf = (px: number, py: number, rot: number): [number, number] => {
      const [dx, dy] = ROTATION_OFFSETS[rot]
      return [px + dx, py + dy]
    }

    const inBounds = (x: number, y: number): boolean => x >= 0 && x < FIELD_WIDTH && y < FIELD_HEIGHT

    const isOccupied = (x: number, y: number): boolean => y >= 0 && grid[y * FIELD_WIDTH + x] !== 0

    const collides = (px: number, py: number, rot: number): boolean => {
      const [sx, sy] = secondCellOf(px, py, rot)
      if (!inBounds(px, py) || !inBounds(sx, sy)) return true
      if (isOccupied(px, py) || isOccupied(sx, sy)) return true
      return false
    }

    const spawnPiece = () => {
      pivotColor = nextPivotColor
      secondColor = nextSecondColor
      nextPivotColor = randomColor()
      nextSecondColor = randomColor()
      rotation = 0
      pivotX = SPAWN_X
      pivotY = SPAWN_Y
      gravityFrameCount = 0
      if (collides(pivotX, pivotY, rotation)) {
        isGameOver = true
      }
    }

    const settleGravity = () => {
      for (let x = 0; x < FIELD_WIDTH; x++) {
        const column: number[] = []
        for (let y = 0; y < FIELD_HEIGHT; y++) {
          const value = grid[y * FIELD_WIDTH + x]
          if (value !== 0) column.push(value)
        }
        const padding = FIELD_HEIGHT - column.length
        for (let y = 0; y < FIELD_HEIGHT; y++) {
          grid[y * FIELD_WIDTH + x] = y < padding ? 0 : column[y - padding]
        }
      }
    }

    // Finds same-color groups of CLEAR_THRESHOLD+ cells without mutating the
    // grid — actual removal is deferred until the pop-effect finishes.
    const findClusters = (): Array<Array<[number, number]>> => {
      const visited = new Uint8Array(FIELD_WIDTH * FIELD_HEIGHT)
      const clusters: Array<Array<[number, number]>> = []
      for (let y = 0; y < FIELD_HEIGHT; y++) {
        for (let x = 0; x < FIELD_WIDTH; x++) {
          const startIndex = y * FIELD_WIDTH + x
          if (visited[startIndex] || grid[startIndex] === 0) continue
          const color = grid[startIndex]
          const group: Array<[number, number]> = []
          const stack: Array<[number, number]> = [[x, y]]
          visited[startIndex] = 1
          while (stack.length > 0) {
            const [cx, cy] = stack.pop() as [number, number]
            group.push([cx, cy])
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]) {
              const nx = cx + dx
              const ny = cy + dy
              if (nx < 0 || nx >= FIELD_WIDTH || ny < 0 || ny >= FIELD_HEIGHT) continue
              const nIndex = ny * FIELD_WIDTH + nx
              if (visited[nIndex] || grid[nIndex] !== color) continue
              visited[nIndex] = 1
              stack.push([nx, ny])
            }
          }
          if (group.length >= CLEAR_THRESHOLD) clusters.push(group)
        }
      }
      return clusters
    }

    // Drives the chain: settle floating puyos, look for a cluster to pop, and
    // either kick off its flash effect or — once nothing more clears — hand
    // control back by spawning the next piece.
    const advanceResolve = () => {
      settleGravity()
      const clusters = findClusters()
      if (clusters.length === 0) {
        isResolving = false
        spawnPiece()
        return
      }
      resolveChain += 1
      poppingCells = clusters.flat()
      score += poppingCells.length * resolveChain
      poppingFrameCount = 0
      isResolving = true
    }

    const lockPiece = () => {
      if (pivotY >= 0) grid[pivotY * FIELD_WIDTH + pivotX] = pivotColor
      const [sx, sy] = secondCellOf(pivotX, pivotY, rotation)
      if (sy >= 0) grid[sy * FIELD_WIDTH + sx] = secondColor

      resolveChain = 0
      advanceResolve()
    }

    const movePiece = (dx: number, dy: number): boolean => {
      if (collides(pivotX + dx, pivotY + dy, rotation)) return false
      pivotX += dx
      pivotY += dy
      return true
    }

    const rotatePiece = () => {
      const nextRotation = (rotation + 1) % 4
      if (!collides(pivotX, pivotY, nextRotation)) rotation = nextRotation
    }

    const hardDrop = () => {
      while (movePiece(0, 1)) {
        // fall until blocked
      }
      lockPiece()
    }

    const reset = () => {
      grid = new Uint8Array(FIELD_WIDTH * FIELD_HEIGHT)
      score = 0
      isGameOver = false
      isResolving = false
      poppingCells = []
      blinkCounter = 0
      leftRepeatCount = 0
      rightRepeatCount = 0
      nextPivotColor = randomColor()
      nextSecondColor = randomColor()
      spawnPiece()
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

        if (isResolving) {
          leftWasPressed = input.isPressed('left')
          rightWasPressed = input.isPressed('right')
          rotateWasPressed = input.isPressed('up')
          confirmWasPressed = confirmPressed
          poppingFrameCount += 1
          if (poppingFrameCount >= POP_EFFECT_DURATION) {
            for (const [x, y] of poppingCells) grid[y * FIELD_WIDTH + x] = 0
            poppingCells = []
            advanceResolve()
          }
          return
        }

        const leftPressed = input.isPressed('left')
        const rightPressed = input.isPressed('right')
        const upPressed = input.isPressed('up')
        const downPressed = input.isPressed('down')

        if (leftPressed && !leftWasPressed) {
          movePiece(-1, 0)
          leftRepeatCount = 0
        } else if (leftPressed) {
          leftRepeatCount += 1
          if (leftRepeatCount >= MOVE_REPEAT_INTERVAL) {
            movePiece(-1, 0)
            leftRepeatCount = 0
          }
        }
        leftWasPressed = leftPressed

        if (rightPressed && !rightWasPressed) {
          movePiece(1, 0)
          rightRepeatCount = 0
        } else if (rightPressed) {
          rightRepeatCount += 1
          if (rightRepeatCount >= MOVE_REPEAT_INTERVAL) {
            movePiece(1, 0)
            rightRepeatCount = 0
          }
        }
        rightWasPressed = rightPressed

        if (upPressed && !rotateWasPressed) rotatePiece()
        rotateWasPressed = upPressed

        if (confirmPressed && !confirmWasPressed) hardDrop()
        confirmWasPressed = confirmPressed

        if (!isGameOver && !isResolving) {
          gravityFrameCount += 1
          const interval = downPressed ? SOFT_DROP_INTERVAL : GRAVITY_INTERVAL
          if (gravityFrameCount >= interval) {
            gravityFrameCount = 0
            if (!movePiece(0, 1)) lockPiece()
          }
        }
      },
      render: (buffer) => {
        const poppingSet = new Set(poppingCells.map(([x, y]) => y * FIELD_WIDTH + x))
        const flashOn = Math.floor(poppingFrameCount / POP_FLASH_INTERVAL) % 2 === 0

        for (let y = 0; y < FIELD_HEIGHT; y++) {
          for (let x = 0; x < FIELD_WIDTH; x++) {
            const index = y * FIELD_WIDTH + x
            const color = grid[index]
            if (color === 0) continue
            const isPopping = poppingSet.has(index)
            setCharacter(buffer, FIELD_OFFSET_X + x, y, isPopping && flashOn ? ON : color)
          }
        }

        for (let py = 0; py < GRID_SIZE; py++) {
          setPixel(buffer, FIELD_LEFT_BORDER_X, py, ON)
          setPixel(buffer, FIELD_RIGHT_BORDER_X, py, ON)
        }

        if (!isGameOver && !isResolving) {
          setCharacter(buffer, FIELD_OFFSET_X + pivotX, pivotY, pivotColor)
          const [sx, sy] = secondCellOf(pivotX, pivotY, rotation)
          if (sy >= 0) setCharacter(buffer, FIELD_OFFSET_X + sx, sy, secondColor)

          setCharacter(buffer, NEXT_PREVIEW_X, NEXT_PREVIEW_Y, nextPivotColor)
          setCharacter(buffer, NEXT_PREVIEW_X, NEXT_PREVIEW_Y + 1, nextSecondColor)
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
      getScore: () => score,
    }
  },
}
