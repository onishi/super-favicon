import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameDefinition } from '../games/types'
import { useFaviconLoop } from '../hooks/useFaviconLoop'
import { useInputState } from '../hooks/useInputState'
import { renderPixelBufferToCanvas } from '../lib/favicon-renderer'
import { renderPaletteBufferToCanvas } from '../lib/palette'
import { applyGlow, createPixelBuffer, GRID_SIZE, type PixelBuffer } from '../lib/pixel-buffer'
import { codeToPixelBuffer } from '../lib/pixel-code'
import { TITLE_LOGO_CODE } from '../lib/title-logo'
import { FaviconPreview } from './FaviconPreview'
import { GameMenu } from './GameMenu'

const TITLE_BUFFER = codeToPixelBuffer(TITLE_LOGO_CODE)

const PAGER_ARROW_COLOR = '#ffffff'
const PAGER_CENTER_Y = Math.floor(GRID_SIZE / 2)

// Leftward chevron anchored at the left edge (x=0); mirrored for the right edge below.
const LEFT_ARROW_OFFSETS: Array<[number, number]> = [
  [2, -2],
  [1, -1],
  [2, -1],
  [0, 0],
  [1, 0],
  [2, 0],
  [1, 1],
  [2, 1],
  [2, 2],
]
const RIGHT_ARROW_OFFSETS: Array<[number, number]> = LEFT_ARROW_OFFSETS.map(([dx, dy]) => [
  GRID_SIZE - 1 - dx,
  dy,
])

function drawPagerArrows(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = PAGER_ARROW_COLOR
  for (const [dx, dy] of LEFT_ARROW_OFFSETS) {
    ctx.fillRect(dx, PAGER_CENTER_Y + dy, 1, 1)
  }
  for (const [dx, dy] of RIGHT_ARROW_OFFSETS) {
    ctx.fillRect(dx, PAGER_CENTER_Y + dy, 1, 1)
  }
}

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

  const render = useCallback((buffer: PixelBuffer, canvas: HTMLCanvasElement) => {
    if (indexRef.current === 0) {
      renderPaletteBufferToCanvas(buffer, canvas)
    } else {
      renderPixelBufferToCanvas(buffer, canvas)
    }
    drawPagerArrows(canvas)
  }, [])

  useFaviconLoop(getBuffer, { fps: 8, previewCanvasRef, render })

  return (
    <>
      <FaviconPreview ref={previewCanvasRef} />
      <p>左右キーでゲームを選択、決定ボタンで開始</p>
      <GameMenu games={games} onSelect={onSelectGame} selectedId={index === 0 ? null : games[index - 1].id} />
    </>
  )
}
