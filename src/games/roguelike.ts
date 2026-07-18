import { GRID_SIZE, GROUND, LOGICAL_GRID_SIZE, ON, ORANGE, RED, YELLOW, setCharacter, setPixel } from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

// Row 0 is reserved as an HP-pip HUD strip; the dungeon itself uses the rest.
const HUD_HEIGHT = 1
const DUNGEON_WIDTH = LOGICAL_GRID_SIZE
const DUNGEON_HEIGHT = LOGICAL_GRID_SIZE - HUD_HEIGHT

const ROOM_COUNT = 5
const ROOM_MIN_SIZE = 2
const ROOM_MAX_SIZE = 4
const ROOM_PLACEMENT_ATTEMPTS = 150
const FLOOR_GENERATION_RETRIES = 5

const BASE_MAX_HP = 5
// Clearing a floor raises the HP ceiling (and heals by the same amount), so
// deeper runs are more sustainable even without items.
const HP_INCREASE_PER_FLOOR = 1
const PLAYER_ATTACK = 1
const ENEMY_HP = 2
const ENEMY_ATTACK = 1
const BASE_ENEMY_COUNT = 2
// Waiting with no enemy adjacent counts as resting: every REST_HEAL_INTERVAL
// consecutive safe waits recovers 1 HP. Moving, attacking, or having an
// enemy nearby resets the streak.
const REST_HEAL_INTERVAL = 3

const FLOOR = 1

interface Room {
  x: number
  y: number
  w: number
  h: number
}

interface Enemy {
  x: number
  y: number
  hp: number
  alive: boolean
}

function rectsOverlap(a: Room, b: Room, padding: number): boolean {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  )
}

function roomCenter(room: Room): { x: number; y: number } {
  return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) }
}

export const roguelikeGame: GameDefinition = {
  id: 'roguelike',
  name: 'ドットダンジョン',
  create: () => {
    let tiles: Uint8Array
    let playerX: number
    let playerY: number
    let playerHp: number
    let maxHp: number
    let stairsX: number
    let stairsY: number
    let enemies: Enemy[]
    let depth: number
    let floorsCleared: number
    let isGameOver: boolean
    let restStreak = 0
    let upWasPressed = false
    let downWasPressed = false
    let leftWasPressed = false
    let rightWasPressed = false
    let confirmWasPressed = false
    let blinkCounter = 0

    const isFloor = (x: number, y: number): boolean =>
      x >= 0 && x < DUNGEON_WIDTH && y >= 0 && y < DUNGEON_HEIGHT && tiles[y * DUNGEON_WIDTH + x] === FLOOR

    const carveHLine = (y: number, x0: number, x1: number) => {
      const minX = Math.min(x0, x1)
      const maxX = Math.max(x0, x1)
      for (let x = minX; x <= maxX; x++) tiles[y * DUNGEON_WIDTH + x] = FLOOR
    }
    const carveVLine = (x: number, y0: number, y1: number) => {
      const minY = Math.min(y0, y1)
      const maxY = Math.max(y0, y1)
      for (let y = minY; y <= maxY; y++) tiles[y * DUNGEON_WIDTH + x] = FLOOR
    }

    // Builds one floor layout; returns null if it couldn't place at least two
    // rooms (vanishingly rare, but the caller retries in that case).
    const buildFloor = (): { rooms: Room[] } | null => {
      tiles = new Uint8Array(DUNGEON_WIDTH * DUNGEON_HEIGHT)
      const rooms: Room[] = []
      for (let attempt = 0; attempt < ROOM_PLACEMENT_ATTEMPTS && rooms.length < ROOM_COUNT; attempt++) {
        const w = ROOM_MIN_SIZE + Math.floor(Math.random() * (ROOM_MAX_SIZE - ROOM_MIN_SIZE + 1))
        const h = ROOM_MIN_SIZE + Math.floor(Math.random() * (ROOM_MAX_SIZE - ROOM_MIN_SIZE + 1))
        const x = 1 + Math.floor(Math.random() * Math.max(1, DUNGEON_WIDTH - w - 2))
        const y = 1 + Math.floor(Math.random() * Math.max(1, DUNGEON_HEIGHT - h - 2))
        const candidate: Room = { x, y, w, h }
        if (rooms.some((r) => rectsOverlap(r, candidate, 1))) continue
        rooms.push(candidate)
      }
      if (rooms.length < 2) return null

      for (const room of rooms) {
        for (let ry = room.y; ry < room.y + room.h; ry++) {
          for (let rx = room.x; rx < room.x + room.w; rx++) tiles[ry * DUNGEON_WIDTH + rx] = FLOOR
        }
      }
      for (let i = 1; i < rooms.length; i++) {
        const a = roomCenter(rooms[i - 1])
        const b = roomCenter(rooms[i])
        if (Math.random() < 0.5) {
          carveHLine(a.y, a.x, b.x)
          carveVLine(b.x, a.y, b.y)
        } else {
          carveVLine(a.x, a.y, b.y)
          carveHLine(b.y, a.x, b.x)
        }
      }
      return { rooms }
    }

    const generateFloor = () => {
      let rooms: Room[] | null = null
      for (let i = 0; i < FLOOR_GENERATION_RETRIES && !rooms; i++) {
        rooms = buildFloor()?.rooms ?? null
      }
      if (!rooms) {
        // Extremely unlikely fallback: one big open room.
        tiles = new Uint8Array(DUNGEON_WIDTH * DUNGEON_HEIGHT).fill(FLOOR)
        rooms = [
          { x: 1, y: 1, w: 2, h: 2 },
          { x: DUNGEON_WIDTH - 3, y: DUNGEON_HEIGHT - 3, w: 2, h: 2 },
        ]
      }

      const start = roomCenter(rooms[0])
      playerX = start.x
      playerY = start.y

      const end = roomCenter(rooms[rooms.length - 1])
      stairsX = end.x
      stairsY = end.y

      enemies = []
      const enemyCount = Math.min(6, BASE_ENEMY_COUNT + depth)
      let placed = 0
      for (let tries = 0; placed < enemyCount && tries < 200; tries++) {
        const idx = Math.floor(Math.random() * tiles.length)
        if (tiles[idx] !== FLOOR) continue
        const ex = idx % DUNGEON_WIDTH
        const ey = Math.floor(idx / DUNGEON_WIDTH)
        if (ex === playerX && ey === playerY) continue
        if (ex === stairsX && ey === stairsY) continue
        if (enemies.some((e) => e.x === ex && e.y === ey)) continue
        enemies.push({ x: ex, y: ey, hp: ENEMY_HP, alive: true })
        placed++
      }
    }

    const reset = () => {
      depth = 1
      floorsCleared = 0
      maxHp = BASE_MAX_HP
      playerHp = maxHp
      isGameOver = false
      blinkCounter = 0
      restStreak = 0
      generateFloor()
    }
    reset()

    const die = () => {
      isGameOver = true
    }

    const moveEnemyToward = (enemy: Enemy) => {
      const dx = Math.sign(playerX - enemy.x)
      const dy = Math.sign(playerY - enemy.y)
      const horizontalFirst = Math.abs(playerX - enemy.x) > Math.abs(playerY - enemy.y)
      const candidates: Array<[number, number]> = horizontalFirst
        ? [
            [dx, 0],
            [0, dy],
          ]
        : [
            [0, dy],
            [dx, 0],
          ]
      for (const [cdx, cdy] of candidates) {
        if (cdx === 0 && cdy === 0) continue
        const nx = enemy.x + cdx
        const ny = enemy.y + cdy
        if (!isFloor(nx, ny)) continue
        if (nx === playerX && ny === playerY) continue
        if (enemies.some((other) => other !== enemy && other.alive && other.x === nx && other.y === ny)) continue
        enemy.x = nx
        enemy.y = ny
        return
      }
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

        const upPressed = input.isPressed('up')
        const downPressed = input.isPressed('down')
        const leftPressed = input.isPressed('left')
        const rightPressed = input.isPressed('right')

        let dx = 0
        let dy = 0
        if (upPressed && !upWasPressed) dy = -1
        else if (downPressed && !downWasPressed) dy = 1
        else if (leftPressed && !leftWasPressed) dx = -1
        else if (rightPressed && !rightWasPressed) dx = 1
        upWasPressed = upPressed
        downWasPressed = downPressed
        leftWasPressed = leftPressed
        rightWasPressed = rightPressed

        let turnTaken = false

        if (dx !== 0 || dy !== 0) {
          restStreak = 0
          const nx = playerX + dx
          const ny = playerY + dy
          if (isFloor(nx, ny)) {
            const target = enemies.find((e) => e.alive && e.x === nx && e.y === ny)
            if (target) {
              target.hp -= PLAYER_ATTACK
              if (target.hp <= 0) target.alive = false
              turnTaken = true
            } else {
              playerX = nx
              playerY = ny
              turnTaken = true
              if (nx === stairsX && ny === stairsY) {
                depth += 1
                floorsCleared += 1
                maxHp += HP_INCREASE_PER_FLOOR
                playerHp = Math.min(maxHp, playerHp + HP_INCREASE_PER_FLOOR)
                generateFloor()
                turnTaken = false
              }
            }
          }
        } else if (confirmPressed && !confirmWasPressed) {
          // Wait a turn in place. Resting while no enemy is adjacent slowly
          // heals; being threatened (or already full HP) resets the streak.
          const isThreatened = enemies.some(
            (e) => e.alive && Math.abs(e.x - playerX) + Math.abs(e.y - playerY) === 1,
          )
          if (!isThreatened && playerHp < maxHp) {
            restStreak += 1
            if (restStreak >= REST_HEAL_INTERVAL) {
              playerHp = Math.min(maxHp, playerHp + 1)
              restStreak = 0
            }
          } else {
            restStreak = 0
          }
          turnTaken = true
        }
        confirmWasPressed = confirmPressed

        if (turnTaken) {
          for (const enemy of enemies) {
            if (!enemy.alive) continue
            const adjacent = Math.abs(enemy.x - playerX) + Math.abs(enemy.y - playerY) === 1
            if (adjacent) {
              playerHp -= ENEMY_ATTACK
              if (playerHp <= 0) {
                die()
                break
              }
            } else {
              moveEnemyToward(enemy)
            }
          }
        }
      },
      render: (buffer) => {
        for (let y = 0; y < DUNGEON_HEIGHT; y++) {
          for (let x = 0; x < DUNGEON_WIDTH; x++) {
            if (tiles[y * DUNGEON_WIDTH + x] === FLOOR) setCharacter(buffer, x, y + HUD_HEIGHT, GROUND)
          }
        }

        setCharacter(buffer, stairsX, stairsY + HUD_HEIGHT, YELLOW)

        for (const enemy of enemies) {
          if (enemy.alive) setCharacter(buffer, enemy.x, enemy.y + HUD_HEIGHT, RED)
        }

        setCharacter(buffer, playerX, playerY + HUD_HEIGHT, ON)

        for (let i = 0; i < Math.min(maxHp, LOGICAL_GRID_SIZE); i++) {
          if (i < playerHp) setCharacter(buffer, i, 0, ORANGE)
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
      getScore: () => floorsCleared,
    }
  },
}
