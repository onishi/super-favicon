import type { GameDefinition } from '../games/types'

interface GameMenuProps {
  games: GameDefinition[]
  onSelect: (id: string) => void
}

export function GameMenu({ games, onSelect }: GameMenuProps) {
  return (
    <ul className="game-menu">
      {games.map((game) => (
        <li key={game.id}>
          <button type="button" onClick={() => onSelect(game.id)}>
            {game.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
