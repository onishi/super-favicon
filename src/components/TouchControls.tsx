import type { PointerEvent } from 'react'
import type { InputState } from '../hooks/useInputState'
import type { InputAction } from '../lib/input'
import './TouchControls.css'

interface TouchControlsProps {
  input: InputState
}

interface ControlButtonProps {
  action: InputAction
  input: InputState
  label: string
  className?: string
}

function ControlButton({ action, input, label, className }: ControlButtonProps) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    input.press(action)
  }
  const handlePointerUp = () => input.release(action)

  return (
    <button
      type="button"
      className={`touch-controls__button ${className ?? ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {label}
    </button>
  )
}

export function TouchControls({ input }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-controls__dpad">
        <ControlButton action="up" input={input} label="▲" className="touch-controls__up" />
        <ControlButton action="left" input={input} label="◀" className="touch-controls__left" />
        <ControlButton action="right" input={input} label="▶" className="touch-controls__right" />
        <ControlButton action="down" input={input} label="▼" className="touch-controls__down" />
      </div>
      <ControlButton action="confirm" input={input} label="1" className="touch-controls__confirm" />
    </div>
  )
}
