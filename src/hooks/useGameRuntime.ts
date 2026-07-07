import { useCallback, useEffect, useRef } from 'react'
import type { GameDefinition } from '../games/types'
import { clearPixelBuffer, createPixelBuffer, type PixelBuffer } from '../lib/pixel-buffer'
import type { InputState } from './useInputState'

export function useGameRuntime(game: GameDefinition, input: InputState): () => PixelBuffer {
  const bufferRef = useRef<PixelBuffer>(createPixelBuffer())
  const instanceRef = useRef(game.create())

  useEffect(() => {
    instanceRef.current = game.create()
  }, [game])

  return useCallback(() => {
    instanceRef.current.update(input)
    clearPixelBuffer(bufferRef.current)
    instanceRef.current.render(bufferRef.current)
    return bufferRef.current
  }, [input])
}
