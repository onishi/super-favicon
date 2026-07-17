// Pages Functions middleware, runs on every request to this Pages project
// regardless of which hostname routed to it (pages.dev alias or custom domain).
const PAGES_DEV_HOST = 'super-favicon.pages.dev'
const CANONICAL_ORIGIN = 'https://super-favicon.com'

interface MiddlewareContext {
  request: Request
  next: () => Promise<Response>
}

export const onRequest = async (context: MiddlewareContext): Promise<Response> => {
  const url = new URL(context.request.url)
  if (url.hostname === PAGES_DEV_HOST) {
    return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, 301)
  }
  return context.next()
}
