import { useCallback, useEffect, useState } from 'react'
import { GameView } from './components/GameView'
import { PixelEditorView } from './components/PixelEditorView'
import { TitleCarousel } from './components/TitleCarousel'
import { GAMES, getGameById } from './games/registry'
import { getEditorFlagFromLocation, setEditorFlagInLocation, setPixelsCodeInLocation } from './lib/editor-url'
import { getGameIdFromLocation, setGameIdInLocation } from './lib/game-url'

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(() => getGameIdFromLocation())
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(() => getEditorFlagFromLocation())

  useEffect(() => {
    const handlePopState = () => {
      setSelectedId(getGameIdFromLocation())
      setIsEditorOpen(getEditorFlagFromLocation())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const selectGame = useCallback((id: string | null) => {
    setEditorFlagInLocation(false)
    setGameIdInLocation(id)
    setSelectedId(id)
    setIsEditorOpen(false)
  }, [])

  const openEditor = useCallback(() => {
    setGameIdInLocation(null)
    setEditorFlagInLocation(true)
    setSelectedId(null)
    setIsEditorOpen(true)
  }, [])

  const startLifeGameFromEditor = useCallback((pixelsCode: string) => {
    setPixelsCodeInLocation(pixelsCode)
    setEditorFlagInLocation(false)
    setGameIdInLocation('life')
    setIsEditorOpen(false)
    setSelectedId('life')
  }, [])

  const game = selectedId ? getGameById(selectedId) : undefined

  return (
    <main>
      <h1>SUPER-FAVICON</h1>
      {game ? (
        <GameView game={game} onExit={() => selectGame(null)} />
      ) : isEditorOpen ? (
        <PixelEditorView onExit={() => selectGame(null)} onStartLifeGame={startLifeGameFromEditor} />
      ) : (
        <>
          <TitleCarousel games={GAMES} onSelectGame={selectGame} />
          <button type="button" onClick={openEditor}>
            ドット絵エディタ
          </button>
        </>
      )}
    </main>
  )
}

export default App
