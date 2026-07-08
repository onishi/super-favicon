import {
  ACCENT,
  BLUE,
  CHARACTER_SIZE,
  CYAN,
  FIELD_BG,
  GRID_SIZE,
  LOGICAL_GRID_SIZE,
  ON,
  ORANGE,
  PURPLE,
  RED,
  setCharacter,
  setPixel,
  YELLOW,
} from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const FIELD_WIDTH = 10
const FIELD_HEIGHT = LOGICAL_GRID_SIZE
// The field is shifted toward the left edge (rather than centered) so the
// freed-up space on the right can fit a 4x4 "next piece" preview box.
const FIELD_OFFSET_X = 1

// 1px-wide vertical border lines drawn just outside the field's left/right
// edges (in physical pixels) so the play area reads clearly against the
// margins around it.
const FIELD_LEFT_BORDER_X = FIELD_OFFSET_X * CHARACTER_SIZE - 1
const FIELD_RIGHT_BORDER_X = (FIELD_OFFSET_X + FIELD_WIDTH) * CHARACTER_SIZE

const NEXT_BOX_WIDTH = 4
const NEXT_BOX_X = LOGICAL_GRID_SIZE - NEXT_BOX_WIDTH
const NEXT_BOX_Y = 2

const GRAVITY_INTERVAL = 14
const SOFT_DROP_INTERVAL = 2
const MOVE_REPEAT_INTERVAL = 5

type Cell = [number, number]

// Each piece is defined as 4 rotation states, each a list of 4 cell offsets
// within a shared 4x4 bounding box (unrotated pieces smaller than 4x4 just
// leave the extra rows/columns of the box empty).
const PIECES: Cell[][][] = [
  // I
  [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  // O
  [
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
  ],
  // T
  [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  // S
  [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  // Z
  [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  // J
  [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  // L
  [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
]

// Colors follow the classic per-piece Tetris convention: I=cyan, O=yellow,
// T=purple, S=green, Z=red, J=blue, L=orange.
const PIECE_COLORS = [CYAN, YELLOW, PURPLE, ACCENT, RED, BLUE, ORANGE]

const SPAWN_X = Math.floor((FIELD_WIDTH - 4) / 2)

export const tetrisGame: GameDefinition = {
  id: 'tetris',
  name: 'テトリス',
  create: () => {
    let grid: Uint8Array
    let pieceType: number
    let nextPieceType: number
    let rotation: number
    let pieceX: number
    let pieceY: number
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

    const cellsFor = (type: number, rot: number): Cell[] => PIECES[type][rot]

    const collides = (px: number, py: number, rot: number, type: number): boolean => {
      for (const [cx, cy] of cellsFor(type, rot)) {
        const absX = px + cx
        const absY = py + cy
        if (absX < 0 || absX >= FIELD_WIDTH || absY >= FIELD_HEIGHT) return true
        if (absY >= 0 && grid[absY * FIELD_WIDTH + absX] !== 0) return true
      }
      return false
    }

    const randomPieceType = (): number => Math.floor(Math.random() * PIECES.length)

    const spawnPiece = () => {
      pieceType = nextPieceType
      nextPieceType = randomPieceType()
      rotation = 0
      pieceX = SPAWN_X
      pieceY = 0
      gravityFrameCount = 0
      if (collides(pieceX, pieceY, rotation, pieceType)) {
        isGameOver = true
      }
    }

    const clearLines = () => {
      let cleared = 0
      for (let y = FIELD_HEIGHT - 1; y >= 0; y--) {
        const rowFull = grid.subarray(y * FIELD_WIDTH, (y + 1) * FIELD_WIDTH).every((cell) => cell !== 0)
        if (!rowFull) continue
        grid.copyWithin(FIELD_WIDTH, 0, y * FIELD_WIDTH)
        grid.fill(0, 0, FIELD_WIDTH)
        cleared += 1
        y += 1
      }
      score += cleared
    }

    const lockPiece = () => {
      const color = PIECE_COLORS[pieceType]
      for (const [cx, cy] of cellsFor(pieceType, rotation)) {
        const absX = pieceX + cx
        const absY = pieceY + cy
        if (absY >= 0) grid[absY * FIELD_WIDTH + absX] = color
      }
      clearLines()
      spawnPiece()
    }

    const movePiece = (dx: number, dy: number): boolean => {
      if (collides(pieceX + dx, pieceY + dy, rotation, pieceType)) return false
      pieceX += dx
      pieceY += dy
      return true
    }

    const rotatePiece = () => {
      const nextRotation = (rotation + 1) % 4
      if (!collides(pieceX, pieceY, nextRotation, pieceType)) rotation = nextRotation
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
      blinkCounter = 0
      leftRepeatCount = 0
      rightRepeatCount = 0
      nextPieceType = randomPieceType()
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

        if (!isGameOver) {
          gravityFrameCount += 1
          const interval = downPressed ? SOFT_DROP_INTERVAL : GRAVITY_INTERVAL
          if (gravityFrameCount >= interval) {
            gravityFrameCount = 0
            if (!movePiece(0, 1)) lockPiece()
          }
        }
      },
      render: (buffer) => {
        for (let y = 0; y < FIELD_HEIGHT; y++) {
          for (let x = 0; x < FIELD_WIDTH; x++) {
            const color = grid[y * FIELD_WIDTH + x]
            setCharacter(buffer, FIELD_OFFSET_X + x, y, color !== 0 ? color : FIELD_BG)
          }
        }

        for (let py = 0; py < GRID_SIZE; py++) {
          setPixel(buffer, FIELD_LEFT_BORDER_X, py, ON)
          setPixel(buffer, FIELD_RIGHT_BORDER_X, py, ON)
        }

        if (!isGameOver) {
          const color = PIECE_COLORS[pieceType]
          for (const [cx, cy] of cellsFor(pieceType, rotation)) {
            const absY = pieceY + cy
            if (absY < 0) continue
            setCharacter(buffer, FIELD_OFFSET_X + pieceX + cx, absY, color)
          }
        }

        if (!isGameOver) {
          for (let y = 0; y < NEXT_BOX_WIDTH; y++) {
            for (let x = 0; x < NEXT_BOX_WIDTH; x++) {
              setCharacter(buffer, NEXT_BOX_X + x, NEXT_BOX_Y + y, FIELD_BG)
            }
          }
          const nextColor = PIECE_COLORS[nextPieceType]
          for (const [cx, cy] of cellsFor(nextPieceType, 0)) {
            setCharacter(buffer, NEXT_BOX_X + cx, NEXT_BOX_Y + cy, nextColor)
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
      getScore: () => score,
    }
  },
}
