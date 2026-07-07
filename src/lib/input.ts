export type InputAction = 'up' | 'down' | 'left' | 'right' | 'confirm'

const KEY_TO_ACTION: Record<string, InputAction> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ' ': 'confirm',
  Enter: 'confirm',
}

export function actionForKey(key: string): InputAction | undefined {
  return KEY_TO_ACTION[key]
}
