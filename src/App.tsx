import { useCallback, useEffect, useState } from 'react'
import { GameMenu } from './components/GameMenu'
import { GameView } from './components/GameView'
import { GAMES, getGameById } from './games/registry'
import { getGameIdFromLocation, setGameIdInLocation } from './lib/game-url'

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(() => getGameIdFromLocation())

  useEffect(() => {
    const handlePopState = () => setSelectedId(getGameIdFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const selectGame = useCallback((id: string | null) => {
    setGameIdInLocation(id)
    setSelectedId(id)
  }, [])

  const game = selectedId ? getGameById(selectedId) : undefined

  return (
    <main>
      <h1>SUPER-FAVICON</h1>
      {game ? (
        <GameView game={game} onExit={() => selectGame(null)} />
      ) : (
        <GameMenu games={GAMES} onSelect={selectGame} />
      )}
    </main>
  )
}

export default App
