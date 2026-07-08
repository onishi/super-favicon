import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameDefinition } from '../games/types'
import { useFaviconLoop } from '../hooks/useFaviconLoop'
import { useInputState } from '../hooks/useInputState'
import { applyGlow, createPixelBuffer, type PixelBuffer } from '../lib/pixel-buffer'
import { codeToPixelBuffer } from '../lib/pixel-code'
import { TITLE_LOGO_CODE } from '../lib/title-logo'
import { FaviconPreview } from './FaviconPreview'
import { GameMenu } from './GameMenu'

const TITLE_BUFFER = codeToPixelBuffer(TITLE_LOGO_CODE)

function renderGamePreview(game: GameDefinition): PixelBuffer {
  const buffer = createPixelBuffer()
  const instance = game.create()
  instance.render(buffer)
  applyGlow(buffer)
  return buffer
}

interface TitleCarouselProps {
  games: GameDefinition[]
  onSelectGame: (id: string) => void
}

export function TitleCarousel({ games, onSelectGame }: TitleCarouselProps) {
  const input = useInputState()
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const indexRef = useRef(0)
  const previewBufferRef = useRef<PixelBuffer>(TITLE_BUFFER)
  const leftWasPressed = useRef(false)
  const rightWasPressed = useRef(false)
  const confirmWasPressed = useRef(false)
  const [index, setIndex] = useState(0)

  const total = games.length + 1

  useEffect(() => {
    previewBufferRef.current = index === 0 ? TITLE_BUFFER : renderGamePreview(games[index - 1])
  }, [index, games])

  const getBuffer = useCallback(() => {
    const leftPressed = input.isPressed('left')
    const rightPressed = input.isPressed('right')
    const confirmPressed = input.isPressed('confirm')

    if (leftPressed && !leftWasPressed.current) {
      indexRef.current = (indexRef.current - 1 + total) % total
      setIndex(indexRef.current)
    }
    if (rightPressed && !rightWasPressed.current) {
      indexRef.current = (indexRef.current + 1) % total
      setIndex(indexRef.current)
    }
    leftWasPressed.current = leftPressed
    rightWasPressed.current = rightPressed

    if (confirmPressed && !confirmWasPressed.current && indexRef.current !== 0) {
      onSelectGame(games[indexRef.current - 1].id)
    }
    confirmWasPressed.current = confirmPressed

    return previewBufferRef.current
  }, [games, total, onSelectGame, input])

  useFaviconLoop(getBuffer, { fps: 8, previewCanvasRef })

  return (
    <>
      <FaviconPreview ref={previewCanvasRef} />
      <p>左右キーでゲームを選択、決定ボタンで開始</p>
      <GameMenu games={games} onSelect={onSelectGame} selectedId={index === 0 ? null : games[index - 1].id} />
    </>
  )
}
