import {
  CHARACTER_SIZE,
  CYAN,
  GRID_SIZE,
  LOGICAL_GRID_SIZE,
  ON,
  ORANGE,
  RED,
  setCharacter,
  setPixel,
} from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const ENEMY_COLS = 5
const ENEMY_ROWS = 3
const ENEMY_SPACING_X = 2
const ENEMY_SPACING_Y = 2
const ENEMY_START_X = 3
const ENEMY_START_Y = 1
const ENEMY_MAX_X = LOGICAL_GRID_SIZE - 1 - (ENEMY_COLS - 1) * ENEMY_SPACING_X

const PLAYER_Y = LOGICAL_GRID_SIZE - 1
// If the formation's lowest row reaches this deep, it's considered to have
// reached the player.
const DANGER_Y = PLAYER_Y - 2

const FORMATION_STEP_INTERVAL = 18
const FORMATION_MIN_STEP_INTERVAL = 6
// The last surviving enemy speeds up well past the usual per-wave floor, for
// a classic "final invader panic" moment.
const LAST_ENEMY_STEP_INTERVAL = 4
const MOVE_REPEAT_INTERVAL = 5

const PLAYER_BULLET_SPEED = 2
const ENEMY_BULLET_SPEED = 1
const ENEMY_FIRE_INTERVAL = 40
const ENEMY_FIRE_CHANCE = 0.5

interface Bullet {
  x: number
  y: number
}

export const invadersGame: GameDefinition = {
  id: 'invaders',
  name: 'インベーダーゲーム',
  create: () => {
    let playerX: number
    let aliveGrid: boolean[]
    let formationBaseX: number
    let formationBaseY: number
    let formationDirection: 1 | -1
    let formationFrameCount = 0
    let waveCount = 0
    let playerBullet: Bullet | null
    let enemyBullet: Bullet | null
    let enemyFireFrameCount = 0
    let leftRepeatCount = 0
    let rightRepeatCount = 0
    let leftWasPressed = false
    let rightWasPressed = false
    let confirmWasPressed = false
    let blinkCounter = 0
    let score = 0
    let isGameOver = false

    const enemyLogicalX = (col: number): number => formationBaseX + col * ENEMY_SPACING_X
    const enemyLogicalY = (row: number): number => formationBaseY + row * ENEMY_SPACING_Y

    const spawnWave = () => {
      aliveGrid = new Array(ENEMY_ROWS * ENEMY_COLS).fill(true)
      formationBaseX = ENEMY_START_X
      formationBaseY = ENEMY_START_Y
      formationDirection = 1
      formationFrameCount = 0
      playerBullet = null
      enemyBullet = null
    }

    const reset = () => {
      playerX = Math.floor(LOGICAL_GRID_SIZE / 2)
      waveCount = 0
      score = 0
      isGameOver = false
      blinkCounter = 0
      leftRepeatCount = 0
      rightRepeatCount = 0
      enemyFireFrameCount = 0
      spawnWave()
    }
    reset()

    const die = () => {
      isGameOver = true
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

        const leftPressed = input.isPressed('left')
        const rightPressed = input.isPressed('right')

        const movePlayer = (dx: number) => {
          playerX = Math.max(0, Math.min(LOGICAL_GRID_SIZE - 1, playerX + dx))
        }

        if (leftPressed && !leftWasPressed) {
          movePlayer(-1)
          leftRepeatCount = 0
        } else if (leftPressed) {
          leftRepeatCount += 1
          if (leftRepeatCount >= MOVE_REPEAT_INTERVAL) {
            movePlayer(-1)
            leftRepeatCount = 0
          }
        }
        leftWasPressed = leftPressed

        if (rightPressed && !rightWasPressed) {
          movePlayer(1)
          rightRepeatCount = 0
        } else if (rightPressed) {
          rightRepeatCount += 1
          if (rightRepeatCount >= MOVE_REPEAT_INTERVAL) {
            movePlayer(1)
            rightRepeatCount = 0
          }
        }
        rightWasPressed = rightPressed

        if (confirmPressed && !confirmWasPressed && !playerBullet) {
          playerBullet = { x: playerX * CHARACTER_SIZE, y: PLAYER_Y * CHARACTER_SIZE }
        }
        confirmWasPressed = confirmPressed

        if (playerBullet) {
          playerBullet.y -= PLAYER_BULLET_SPEED
          if (playerBullet.y < 0) {
            playerBullet = null
          } else {
            const bulletCol = Math.floor(playerBullet.x / CHARACTER_SIZE)
            const bulletRow = Math.floor(playerBullet.y / CHARACTER_SIZE)
            outer: for (let r = 0; r < ENEMY_ROWS; r++) {
              for (let c = 0; c < ENEMY_COLS; c++) {
                const idx = r * ENEMY_COLS + c
                if (!aliveGrid[idx]) continue
                if (enemyLogicalX(c) === bulletCol && enemyLogicalY(r) === bulletRow) {
                  aliveGrid[idx] = false
                  score += 1
                  playerBullet = null
                  break outer
                }
              }
            }
          }
        }

        if (enemyBullet) {
          enemyBullet.y += ENEMY_BULLET_SPEED
          const bulletCol = Math.floor(enemyBullet.x / CHARACTER_SIZE)
          const bulletRow = Math.floor(enemyBullet.y / CHARACTER_SIZE)
          if (bulletRow >= LOGICAL_GRID_SIZE) {
            enemyBullet = null
          } else if (bulletRow === PLAYER_Y && bulletCol === playerX) {
            die()
            return
          }
        }

        if (!enemyBullet) {
          enemyFireFrameCount += 1
          if (enemyFireFrameCount >= ENEMY_FIRE_INTERVAL) {
            enemyFireFrameCount = 0
            if (Math.random() < ENEMY_FIRE_CHANCE) {
              const aliveIndices: number[] = []
              for (let i = 0; i < aliveGrid.length; i++) if (aliveGrid[i]) aliveIndices.push(i)
              if (aliveIndices.length > 0) {
                const idx = aliveIndices[Math.floor(Math.random() * aliveIndices.length)]
                const r = Math.floor(idx / ENEMY_COLS)
                const c = idx % ENEMY_COLS
                enemyBullet = { x: enemyLogicalX(c) * CHARACTER_SIZE, y: enemyLogicalY(r) * CHARACTER_SIZE }
              }
            }
          }
        }

        const aliveCount = aliveGrid.reduce((count, alive) => count + (alive ? 1 : 0), 0)
        if (aliveCount === 0) {
          waveCount += 1
          spawnWave()
        } else {
          formationFrameCount += 1
          const stepInterval =
            aliveCount === 1
              ? LAST_ENEMY_STEP_INTERVAL
              : Math.max(FORMATION_MIN_STEP_INTERVAL, FORMATION_STEP_INTERVAL - waveCount * 2)
          if (formationFrameCount >= stepInterval) {
            formationFrameCount = 0
            const atRightEdge = formationDirection === 1 && formationBaseX >= ENEMY_MAX_X
            const atLeftEdge = formationDirection === -1 && formationBaseX <= 0
            if (atRightEdge || atLeftEdge) {
              formationDirection = formationDirection === 1 ? -1 : 1
              formationBaseY += 1
            } else {
              formationBaseX += formationDirection
            }
          }
        }

        const lowestEnemyY = formationBaseY + (ENEMY_ROWS - 1) * ENEMY_SPACING_Y
        if (lowestEnemyY >= DANGER_Y) {
          die()
        }
      },
      render: (buffer) => {
        for (let r = 0; r < ENEMY_ROWS; r++) {
          for (let c = 0; c < ENEMY_COLS; c++) {
            if (!aliveGrid[r * ENEMY_COLS + c]) continue
            setCharacter(buffer, enemyLogicalX(c), enemyLogicalY(r), RED)
          }
        }

        setCharacter(buffer, playerX, PLAYER_Y, CYAN)

        if (playerBullet) {
          setPixel(buffer, playerBullet.x, playerBullet.y, ON)
          if (playerBullet.y + 1 < GRID_SIZE) setPixel(buffer, playerBullet.x, playerBullet.y + 1, ON)
        }

        if (enemyBullet) {
          setPixel(buffer, enemyBullet.x, enemyBullet.y, ORANGE)
          if (enemyBullet.y + 1 < GRID_SIZE) setPixel(buffer, enemyBullet.x, enemyBullet.y + 1, ORANGE)
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
