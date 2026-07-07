import { LOGICAL_GRID_SIZE } from '../../lib/pixel-buffer'
import type { Pattern } from './patterns'

export function createGrid(): Uint8Array {
  return new Uint8Array(LOGICAL_GRID_SIZE * LOGICAL_GRID_SIZE)
}

export function placePattern(grid: Uint8Array, pattern: Pattern, offsetX: number, offsetY: number): void {
  for (const [dx, dy] of pattern) {
    const x = (offsetX + dx + LOGICAL_GRID_SIZE) % LOGICAL_GRID_SIZE
    const y = (offsetY + dy + LOGICAL_GRID_SIZE) % LOGICAL_GRID_SIZE
    grid[y * LOGICAL_GRID_SIZE + x] = 1
  }
}

function countNeighbors(grid: Uint8Array, x: number, y: number): number {
  let count = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = (x + dx + LOGICAL_GRID_SIZE) % LOGICAL_GRID_SIZE
      const ny = (y + dy + LOGICAL_GRID_SIZE) % LOGICAL_GRID_SIZE
      count += grid[ny * LOGICAL_GRID_SIZE + nx]
    }
  }
  return count
}

export function step(grid: Uint8Array): Uint8Array {
  const next = createGrid()
  for (let y = 0; y < LOGICAL_GRID_SIZE; y++) {
    for (let x = 0; x < LOGICAL_GRID_SIZE; x++) {
      const alive = grid[y * LOGICAL_GRID_SIZE + x] === 1
      const neighbors = countNeighbors(grid, x, y)
      const willBeAlive = alive ? neighbors === 2 || neighbors === 3 : neighbors === 3
      next[y * LOGICAL_GRID_SIZE + x] = willBeAlive ? 1 : 0
    }
  }
  return next
}
