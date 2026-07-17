import { useCallback, useEffect, useRef } from 'react'
import type { GameDefinition } from '../games/types'
import { applyGlow, clearPixelBuffer, createPixelBuffer, type PixelBuffer } from '../lib/pixel-buffer'
import type { InputState } from './useInputState'

export interface GameRuntime {
  getBuffer: () => PixelBuffer
  getScore: () => number
  getStatusText: () => string | undefined
}

export function useGameRuntime(game: GameDefinition, input: InputState): GameRuntime {
  const bufferRef = useRef<PixelBuffer>(createPixelBuffer())
  const instanceRef = useRef(game.create())

  useEffect(() => {
    instanceRef.current = game.create()
  }, [game])

  const getBuffer = useCallback(() => {
    instanceRef.current.update(input)
    clearPixelBuffer(bufferRef.current)
    instanceRef.current.render(bufferRef.current)
    applyGlow(bufferRef.current)
    return bufferRef.current
  }, [input])

  const getScore = useCallback(() => instanceRef.current.getScore?.() ?? 0, [])
  const getStatusText = useCallback(() => instanceRef.current.getStatusText?.(), [])

  return { getBuffer, getScore, getStatusText }
}
