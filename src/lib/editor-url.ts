const EDITOR_PARAM = 'editor'
const PIXELS_PARAM = 'pixels'

export function getEditorFlagFromLocation(): boolean {
  return new URLSearchParams(window.location.search).get(EDITOR_PARAM) === '1'
}

export function setEditorFlagInLocation(isOpen: boolean): void {
  const url = new URL(window.location.href)
  if (isOpen) {
    url.searchParams.set(EDITOR_PARAM, '1')
  } else {
    url.searchParams.delete(EDITOR_PARAM)
  }
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
