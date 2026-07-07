import { blinkDemoGame } from './blink-demo'
import { moveDemoGame } from './move-demo'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [moveDemoGame, blinkDemoGame]

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}
