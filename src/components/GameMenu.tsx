import type { GameDefinition } from '../games/types'

interface GameMenuProps {
  games: GameDefinition[]
  onSelect: (id: string) => void
  selectedId?: string | null
}

export function GameMenu({ games, onSelect, selectedId }: GameMenuProps) {
  return (
    <ul className="game-menu">
      {games.map((game) => (
        <li key={game.id}>
          <button
            type="button"
            aria-pressed={selectedId === game.id}
            style={{ outline: selectedId === game.id ? '3px solid var(--accent)' : undefined }}
            onClick={() => onSelect(game.id)}
          >
            {game.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
