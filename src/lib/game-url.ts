const GAME_PARAM = 'game'

export function getGameIdFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get(GAME_PARAM)
}

export function setGameIdInLocation(id: string | null): void {
  const url = new URL(window.location.href)
  if (id) {
    url.searchParams.set(GAME_PARAM, id)
  } else {
    url.searchParams.delete(GAME_PARAM)
  }
  window.history.pushState({}, '', url)
}
