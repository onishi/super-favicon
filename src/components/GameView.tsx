import { useEffect, useRef } from 'react'
import type { GameDefinition } from '../games/types'
import { useFaviconLoop } from '../hooks/useFaviconLoop'
import { useGameRuntime } from '../hooks/useGameRuntime'
import { useInputState } from '../hooks/useInputState'
import { FaviconPreview } from './FaviconPreview'
import { TouchControls } from './TouchControls'

interface GameViewProps {
  game: GameDefinition
  onExit: () => void
}

export function GameView({ game, onExit }: GameViewProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const input = useInputState()
  const getBuffer = useGameRuntime(game, input)

  useFaviconLoop(getBuffer, { fps: 12, previewCanvasRef })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  return (
    <div>
      <h2>{game.name}</h2>
      <FaviconPreview ref={previewCanvasRef} />
      <TouchControls input={input} onReset={onExit} />
    </div>
  )
}
