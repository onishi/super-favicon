import { useCallback, useEffect, useState } from 'react'
import { BrowserChrome } from './components/BrowserChrome'
import { GameView } from './components/GameView'
import { PixelEditorView } from './components/PixelEditorView'
import { TitleCarousel } from './components/TitleCarousel'
import { GAMES, getGameById } from './games/registry'
import { getEditorFlagFromLocation, setEditorFlagInLocation, setPixelsCodeInLocation } from './lib/editor-url'
import { getGameIdFromLocation, setGameIdInLocation } from './lib/game-url'

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(() => getGameIdFromLocation())
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(() => getEditorFlagFromLocation())
  const [isMaximized, setIsMaximized] = useState(false)

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

  const closeToTitle = useCallback(() => {
    setIsMaximized(false)
    selectGame(null)
  }, [selectGame])

  return (
    <BrowserChrome
      isMaximized={isMaximized}
      onMaximize={() => setIsMaximized(true)}
      onMinimize={() => setIsMaximized(false)}
      onCloseToTitle={closeToTitle}
    >
      <main>
        {game ? (
          <GameView game={game} onExit={() => selectGame(null)} isMaximized={isMaximized} />
        ) : isEditorOpen ? (
          <PixelEditorView onExit={() => selectGame(null)} onStartLifeGame={startLifeGameFromEditor} />
        ) : (
          <>
            <TitleCarousel games={GAMES} onSelectGame={selectGame} isMaximized={isMaximized} />
            <button type="button" className="hidden-editor-button" onClick={openEditor} aria-label="ドット絵エディタ">
              ✎
            </button>
          </>
        )}
      </main>
    </BrowserChrome>
  )
}

export default App
