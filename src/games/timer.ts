import {
  ACCENT,
  GRID_SIZE,
  LOGICAL_GRID_SIZE,
  ON,
  setCharacter,
  setPixel,
  type PixelBuffer,
} from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const MIN_MINUTES = 1
const MAX_MINUTES = 10
const DEFAULT_MINUTES = 3

// 3x5 (colon: 1x5) dot-matrix digit font, drawn at logical-cell resolution so
// strokes survive the 32→16 favicon downscale (see CHARACTER_SIZE).
const DIGIT_GLYPHS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '010', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
}

// Layout (16 logical rows): top margin 3 / digits 5 / gap 2 / bar 3 / bottom margin 3.
const DIGIT_TOP_Y = 3
const BAR_TOP_Y = 10
const BAR_HEIGHT = 3
const DOT_ROW_Y = BAR_TOP_Y + 1
const DOT_ROW_START_X = Math.floor((LOGICAL_GRID_SIZE - MAX_MINUTES) / 2)

// Below this fraction of time remaining, the digits and bar blink to signal urgency.
const URGENT_FRACTION = 0.1
const BLINK_INTERVAL = 4

type Phase = 'select' | 'running' | 'finished'

function formatMmSs(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function measureTextWidth(text: string, gap: number): number {
  let width = 0
  for (const ch of text) width += DIGIT_GLYPHS[ch][0].length
  return width + gap * Math.max(0, text.length - 1)
}

function drawText(buffer: PixelBuffer, text: string, topY: number, color: number): void {
  const gap = measureTextWidth(text, 1) <= LOGICAL_GRID_SIZE ? 1 : 0
  let x = Math.floor((LOGICAL_GRID_SIZE - measureTextWidth(text, gap)) / 2)
  for (const ch of text) {
    const glyph = DIGIT_GLYPHS[ch]
    for (let row = 0; row < glyph.length; row++) {
      const bits = glyph[row]
      for (let col = 0; col < bits.length; col++) {
        if (bits[col] === '1') setCharacter(buffer, x + col, topY + row, color)
      }
    }
    x += glyph[0].length + gap
  }
}

export const timerGame: GameDefinition = {
  id: 'timer',
  name: 'タイマー',
  create: () => {
    let phase: Phase = 'select'
    let selectedMinutes = DEFAULT_MINUTES
    let totalMs = 0
    let remainingMs = 0
    let lastTimestamp = 0
    let blinkCounter = 0
    let upWasPressed = false
    let downWasPressed = false
    let confirmWasPressed = false

    const reset = () => {
      phase = 'select'
      selectedMinutes = DEFAULT_MINUTES
      totalMs = 0
      remainingMs = 0
      blinkCounter = 0
    }

    return {
      update: (input) => {
        const upPressed = input.isPressed('up')
        const downPressed = input.isPressed('down')
        const confirmPressed = input.isPressed('confirm')

        if (phase === 'select') {
          if (upPressed && !upWasPressed) selectedMinutes = Math.min(MAX_MINUTES, selectedMinutes + 1)
          else if (downPressed && !downWasPressed) selectedMinutes = Math.max(MIN_MINUTES, selectedMinutes - 1)

          if (confirmPressed && !confirmWasPressed) {
            phase = 'running'
            totalMs = selectedMinutes * 60_000
            remainingMs = totalMs
            lastTimestamp = performance.now()
            blinkCounter = 0
          }
        } else if (phase === 'running') {
          const now = performance.now()
          remainingMs = Math.max(0, remainingMs - (now - lastTimestamp))
          lastTimestamp = now
          blinkCounter += 1

          if (remainingMs <= 0) {
            phase = 'finished'
            blinkCounter = 0
          }
        } else {
          blinkCounter += 1
          if (confirmPressed && !confirmWasPressed) reset()
        }

        upWasPressed = upPressed
        downWasPressed = downPressed
        confirmWasPressed = confirmPressed
      },
      render: (buffer) => {
        const displaySeconds = phase === 'select' ? selectedMinutes * 60 : Math.ceil(remainingMs / 1000)
        const text = formatMmSs(displaySeconds)

        const fraction = phase === 'running' && totalMs > 0 ? remainingMs / totalMs : 1
        const isUrgent = phase === 'running' && fraction <= URGENT_FRACTION
        const isBlinkVisible = Math.floor(blinkCounter / BLINK_INTERVAL) % 2 === 0
        const showBlinkables = !isUrgent || isBlinkVisible

        if (showBlinkables) {
          drawText(buffer, text, DIGIT_TOP_Y, isUrgent ? ACCENT : ON)
        }

        if (phase === 'select') {
          for (let i = 0; i < selectedMinutes; i++) {
            setCharacter(buffer, DOT_ROW_START_X + i, DOT_ROW_Y, ON)
          }
          return
        }

        if (phase === 'running' && showBlinkables) {
          const filledWidth = Math.round(fraction * LOGICAL_GRID_SIZE)
          const color = isUrgent ? ACCENT : ON
          for (let x = 0; x < filledWidth; x++) {
            for (let y = BAR_TOP_Y; y < BAR_TOP_Y + BAR_HEIGHT; y++) {
              setCharacter(buffer, x, y, color)
            }
          }
        }

        if (phase === 'finished' && isBlinkVisible) {
          for (let i = 0; i < GRID_SIZE; i++) {
            setPixel(buffer, i, 0, ACCENT)
            setPixel(buffer, i, GRID_SIZE - 1, ACCENT)
            setPixel(buffer, 0, i, ACCENT)
            setPixel(buffer, GRID_SIZE - 1, i, ACCENT)
          }
        }
      },
      getStatusText: () => {
        const seconds = phase === 'select' ? selectedMinutes * 60 : Math.ceil(remainingMs / 1000)
        return formatMmSs(seconds)
      },
    }
  },
}
