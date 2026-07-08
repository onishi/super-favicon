import { useState, type PointerEvent } from 'react'
import type { InputState } from '../hooks/useInputState'
import type { InputAction } from '../lib/input'
import './TouchControls.css'

interface TouchControlsProps {
  input: InputState
  onReset?: () => void
}

interface ControlButtonProps {
  action: InputAction
  input: InputState
  label?: string
  className?: string
}

function ControlButton({ action, input, label, className }: ControlButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    input.press(action)
    setIsPressed(true)
    // Keep receiving pointer events for this button even if the finger drifts
    // off its bounds before lifting, so release is never missed (which would
    // otherwise leave the action stuck "held"). Not all pointers support
    // capture (e.g. synthetic events in tests), so this is best-effort.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }
  const handlePointerUp = () => {
    input.release(action)
    setIsPressed(false)
  }

  const pressedClass = isPressed ? 'touch-controls__button--pressed' : ''

  return (
    <button
      type="button"
      className={`touch-controls__button ${className ?? ''} ${pressedClass}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {label}
    </button>
  )
}

export function TouchControls({ input, onReset }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-controls__row">
        <div className="touch-controls__dpad">
          <ControlButton action="up" input={input} label="▲" className="touch-controls__up" />
          <ControlButton action="left" input={input} label="◀" className="touch-controls__left" />
          <ControlButton action="right" input={input} label="▶" className="touch-controls__right" />
          <ControlButton action="down" input={input} label="▼" className="touch-controls__down" />
        </div>
        <ControlButton action="confirm" input={input} className="touch-controls__confirm" />
      </div>
      {onReset && (
        <button type="button" className="touch-controls__reset" onClick={onReset}>
          RESET
        </button>
      )}
    </div>
  )
}
