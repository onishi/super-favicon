import { lifeGame } from './life'
import { snakeGame } from './snake'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [lifeGame, snakeGame]

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}
