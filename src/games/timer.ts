import { ACCENT, LOGICAL_GRID_SIZE, ON, setCharacter } from '../lib/pixel-buffer'
import type { GameDefinition } from './types'

const MIN_MINUTES = 1
const MAX_MINUTES = 10
const DEFAULT_MINUTES = 3

// Selection dots: one per selectable minute, centered on the grid.
const DOT_ROW_Y = Math.floor(LOGICAL_GRID_SIZE / 2)
const DOT_ROW_START_X = Math.floor((LOGICAL_GRID_SIZE - MAX_MINUTES) / 2)

// Progress bar: a few rows thick, centered vertically, full grid width.
const BAR_TOP_Y = DOT_ROW_Y - 1
const BAR_HEIGHT = 3
// Below this fraction of time remaining, the bar blinks to signal urgency.
const URGENT_FRACTION = 0.1
const BLINK_INTERVAL = 4

type Phase = 'select' | 'running' | 'finished'

function formatMmSs(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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
          }
        } else if (phase === 'running') {
          const now = performance.now()
          remainingMs = Math.max(0, remainingMs - (now - lastTimestamp))
          lastTimestamp = now

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
        if (phase === 'select') {
          for (let i = 0; i < selectedMinutes; i++) {
            setCharacter(buffer, DOT_ROW_START_X + i, DOT_ROW_Y, ON)
          }
          return
        }

        const fraction = totalMs === 0 ? 0 : remainingMs / totalMs
        const isUrgent = fraction <= URGENT_FRACTION
        const isBlinkedOff = isUrgent && Math.floor(blinkCounter / BLINK_INTERVAL) % 2 === 1
        if (phase === 'running' && isBlinkedOff) return

        const filledWidth = phase === 'finished' ? 0 : Math.round(fraction * LOGICAL_GRID_SIZE)
        const color = isUrgent ? ACCENT : ON
        for (let x = 0; x < filledWidth; x++) {
          for (let y = BAR_TOP_Y; y < BAR_TOP_Y + BAR_HEIGHT; y++) {
            setCharacter(buffer, x, y, color)
          }
        }

        if (phase === 'finished' && Math.floor(blinkCounter / BLINK_INTERVAL) % 2 === 0) {
          for (let x = 0; x < LOGICAL_GRID_SIZE; x++) {
            for (let y = BAR_TOP_Y; y < BAR_TOP_Y + BAR_HEIGHT; y++) {
              setCharacter(buffer, x, y, ACCENT)
            }
          }
        }
      },
      getStatusText: () => {
        const seconds =
          phase === 'select' ? selectedMinutes * 60 : Math.ceil(remainingMs / 1000)
        return formatMmSs(seconds)
      },
    }
  },
}
