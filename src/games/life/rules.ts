import { GRID_SIZE } from '../../lib/pixel-buffer'
import type { Pattern } from './patterns'

export function createGrid(): Uint8Array {
  return new Uint8Array(GRID_SIZE * GRID_SIZE)
}

export function placePattern(grid: Uint8Array, pattern: Pattern, offsetX: number, offsetY: number): void {
  for (const [dx, dy] of pattern) {
    const x = (offsetX + dx + GRID_SIZE) % GRID_SIZE
    const y = (offsetY + dy + GRID_SIZE) % GRID_SIZE
    grid[y * GRID_SIZE + x] = 1
  }
}

function countNeighbors(grid: Uint8Array, x: number, y: number): number {
  let count = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = (x + dx + GRID_SIZE) % GRID_SIZE
      const ny = (y + dy + GRID_SIZE) % GRID_SIZE
      count += grid[ny * GRID_SIZE + nx]
    }
  }
  return count
}

export function step(grid: Uint8Array): Uint8Array {
  const next = createGrid()
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const alive = grid[y * GRID_SIZE + x] === 1
      const neighbors = countNeighbors(grid, x, y)
      const willBeAlive = alive ? neighbors === 2 || neighbors === 3 : neighbors === 3
      next[y * GRID_SIZE + x] = willBeAlive ? 1 : 0
    }
  }
  return next
}
