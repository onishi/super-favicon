const EDITOR_PATH = '/editor'
const PIXELS_PARAM = 'pixels'

export function getEditorFlagFromLocation(): boolean {
  return window.location.pathname === EDITOR_PATH
}

export function setEditorFlagInLocation(isOpen: boolean): void {
  const url = new URL(window.location.href)
  url.pathname = isOpen ? EDITOR_PATH : '/'
  window.history.pushState({}, '', url)
}

export function getPixelsCodeFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get(PIXELS_PARAM)
}

export function setPixelsCodeInLocation(code: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set(PIXELS_PARAM, code)
  window.history.replaceState({}, '', url)
}
