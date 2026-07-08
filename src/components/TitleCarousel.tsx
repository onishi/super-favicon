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
const PAGER_OUTLINE_COLOR = '#000000'
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

function toAbsoluteCells(offsets: Array<[number, number]>): Array<[number, number]> {
  return offsets.map(([x, dy]) => [x, PAGER_CENTER_Y + dy])
}

function computeOutlineCells(cells: Array<[number, number]>): Array<[number, number]> {
  const cellKeys = new Set(cells.map(([x, y]) => `${x},${y}`))
  const outline = new Map<string, [number, number]>()
  for (const [x, y] of cells) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue
        const key = `${nx},${ny}`
        if (!cellKeys.has(key)) outline.set(key, [nx, ny])
      }
    }
  }
  return [...outline.values()]
}

const PAGER_FILL_CELLS = [...toAbsoluteCells(LEFT_ARROW_OFFSETS), ...toAbsoluteCells(RIGHT_ARROW_OFFSETS)]
const PAGER_OUTLINE_CELLS = computeOutlineCells(PAGER_FILL_CELLS)
const PAGER_BLINK_INTERVAL = 4

function drawPagerArrows(canvas: HTMLCanvasElement, blinkCounter: number): void {
  if (Math.floor(blinkCounter / PAGER_BLINK_INTERVAL) % 2 !== 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = PAGER_OUTLINE_COLOR
  for (const [x, y] of PAGER_OUTLINE_CELLS) {
    ctx.fillRect(x, y, 1, 1)
  }
  ctx.fillStyle = PAGER_ARROW_COLOR
  for (const [x, y] of PAGER_FILL_CELLS) {
    ctx.fillRect(x, y, 1, 1)
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
  const blinkCounterRef = useRef(0)
  const [index, setIndex] = useState(0)

  const total = games.length + 1

  useEffect(() => {
    previewBufferRef.current = index === 0 ? TITLE_BUFFER : renderGamePreview(games[index - 1])
  }, [index, games])

  const getBuffer = useCallback(() => {
    blinkCounterRef.current += 1

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
    drawPagerArrows(canvas, blinkCounterRef.current)
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
