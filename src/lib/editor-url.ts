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

export function getPixelsHexFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get(PIXELS_PARAM)
}

export function setPixelsHexInLocation(hex: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set(PIXELS_PARAM, hex)
  window.history.replaceState({}, '', url)
}
