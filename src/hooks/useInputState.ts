import { useEffect, useRef } from 'react'
import { actionForKey, type InputAction } from '../lib/input'

export interface InputState {
  isPressed: (action: InputAction) => boolean
  press: (action: InputAction) => void
  release: (action: InputAction) => void
  // Lets UI (e.g. the on-screen pad) reflect the held state live, regardless
  // of whether the action came from keyboard or touch.
  subscribe: (action: InputAction, listener: (held: boolean) => void) => () => void
}

export function useInputState(): InputState {
  const heldRef = useRef<Record<InputAction, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
  })
  // Sticks until the next isPressed() read. Without this, a tap shorter than
  // the game loop's poll interval (press+release both landing between two
  // ticks) would never be observed at all — the input would just vanish.
  const latchRef = useRef<Record<InputAction, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
  })

  const listenersRef = useRef<Record<InputAction, Set<(held: boolean) => void>>>({
    up: new Set(),
    down: new Set(),
    left: new Set(),
    right: new Set(),
    confirm: new Set(),
  })

  const notify = (action: InputAction) => {
    for (const listener of listenersRef.current[action]) listener(heldRef.current[action])
  }

  const press = (action: InputAction) => {
    heldRef.current[action] = true
    latchRef.current[action] = true
    notify(action)
  }
  const release = (action: InputAction) => {
    heldRef.current[action] = false
    notify(action)
  }

  const subscribe = (action: InputAction, listener: (held: boolean) => void) => {
    listenersRef.current[action].add(listener)
    return () => listenersRef.current[action].delete(listener)
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

  const isPressed = (action: InputAction) => {
    const pressed = heldRef.current[action] || latchRef.current[action]
    latchRef.current[action] = false
    return pressed
  }

  return {
    isPressed,
    press,
    release,
    subscribe,
  }
}
