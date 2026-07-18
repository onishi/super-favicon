import { useEffect, useRef } from 'react'
import type { GameDefinition } from '../games/types'
import { useFaviconLoop } from '../hooks/useFaviconLoop'
import { useGameRuntime } from '../hooks/useGameRuntime'
import { useInputState } from '../hooks/useInputState'
import { renderPaletteBufferToCanvas } from '../lib/palette'
import { FaviconPreview } from './FaviconPreview'
import { TouchControls } from './TouchControls'

const TITLE_UPDATE_INTERVAL_MS = 250

interface GameViewProps {
  game: GameDefinition
  onExit: () => void
  isMaximized: boolean
}

export function GameView({ game, onExit, isMaximized }: GameViewProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const input = useInputState()
  const { getBuffer, getScore, getStatusText } = useGameRuntime(game, input)

  useFaviconLoop(getBuffer, {
    fps: 12,
    previewCanvasRef,
    render: game.colorMode === 'palette' ? renderPaletteBufferToCanvas : undefined,
  })

  useEffect(() => {
    const updateTitle = () => {
      const statusText = getStatusText()
      document.title = `[${statusText ?? getScore()}] ${game.name}`
    }
    updateTitle()
    const interval = setInterval(updateTitle, TITLE_UPDATE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [getScore, getStatusText, game.name])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  return (
    <div>
      {isMaximized && <FaviconPreview ref={previewCanvasRef} />}
      <TouchControls input={input} onReset={onExit} />
    </div>
  )
}
