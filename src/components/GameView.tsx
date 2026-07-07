import { useRef } from 'react'
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

  return (
    <div>
      <button type="button" onClick={onExit}>
        ← メニューに戻る
      </button>
      <h2>{game.name}</h2>
      <FaviconPreview ref={previewCanvasRef} />
      <TouchControls input={input} />
    </div>
  )
}
