import { lifeGame } from './life'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [lifeGame]

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}
