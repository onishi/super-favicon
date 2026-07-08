import { flappyGame } from './flappy'
import { lifeGame } from './life'
import { puyoGame } from './puyo'
import { snakeGame } from './snake'
import { tetrisGame } from './tetris'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [lifeGame, snakeGame, flappyGame, tetrisGame, puyoGame]

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}
