// Pages Functions middleware, runs on every request to this Pages project
// regardless of which hostname routed to it (pages.dev alias or custom domain).
const PAGES_DEV_HOST = 'super-favicon.pages.dev'
const CANONICAL_ORIGIN = 'https://super-favicon.com'

// Pre-/editor-path era link (see lib/editor-url.ts): ?editor=1 opened the
// pixel editor at the root path. Redirect old links to the new /editor path,
// keeping any other query params (e.g. ?pixels=...) intact.
const LEGACY_EDITOR_PARAM = 'editor'
const LEGACY_EDITOR_VALUE = '1'
const EDITOR_PATH = '/editor'

interface MiddlewareContext {
  request: Request
  next: () => Promise<Response>
}

export const onRequest = async (context: MiddlewareContext): Promise<Response> => {
  const url = new URL(context.request.url)

  if (url.hostname === PAGES_DEV_HOST) {
    return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, 301)
  }

  if (url.searchParams.get(LEGACY_EDITOR_PARAM) === LEGACY_EDITOR_VALUE) {
    url.searchParams.delete(LEGACY_EDITOR_PARAM)
    url.pathname = EDITOR_PATH
    return Response.redirect(url.toString(), 301)
  }

  return context.next()
}
