import { useEffect, useRef } from 'react'
import { actionForKey, type InputAction } from '../lib/input'

export interface InputState {
  isPressed: (action: InputAction) => boolean
  press: (action: InputAction) => void
  release: (action: InputAction) => void
}

export function useInputState(): InputState {
  const pressedRef = useRef<Record<InputAction, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
  })

  const press = (action: InputAction) => {
    pressedRef.current[action] = true
  }
  const release = (action: InputAction) => {
    pressedRef.current[action] = false
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = actionForKey(event.key)
      if (!action) return
      press(action)
      event.preventDefault()
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      const action = actionForKey(event.key)
      if (!action) return
      release(action)
      event.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return {
    isPressed: (action) => pressedRef.current[action],
    press,
    release,
  }
}
