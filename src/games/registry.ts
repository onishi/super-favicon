import { flappyGame } from './flappy'
import { invadersGame } from './invaders'
import { lifeGame } from './life'
import { puyoGame } from './puyo'
import { roguelikeGame } from './roguelike'
import { snakeGame } from './snake'
import { tetrisGame } from './tetris'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [
  lifeGame,
  snakeGame,
  flappyGame,
  tetrisGame,
  puyoGame,
  invadersGame,
  roguelikeGame,
]

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}
