import { RouteLocationRaw, Router } from 'vue-router'

export const buildUrl = (router: Router, to: RouteLocationRaw) => {
  const base = document.querySelector('base')
  const isHistoryMode = !!base
  const baseUrl = new URL(window.location.href.split('#')[0])
  baseUrl.search = ''

  if (isHistoryMode) {
    // in history mode we can't determine the base path, it must be provided by the document
    baseUrl.pathname = new URL(base.href).pathname
  } else {
    // in hash mode, auto-determine the base path by removing `/index.html`
    if (baseUrl.pathname.endsWith('/index.html')) {
      baseUrl.pathname = baseUrl.pathname.split('/').slice(0, -1).filter(Boolean).join('/')
    }
  }

  /**
   * build full url by either
   * - concatenating baseUrl and path (for unknown/non-router urls, e.g. `oidc-callback.html`) or
   * - resolving via router (for known routes, given as path or route location)
   */
  if (typeof to === 'string' && /\.(html?)$/i.test(to)) {
    baseUrl.pathname = [...baseUrl.pathname.split('/'), ...to.split('/')].filter(Boolean).join('/')
    return baseUrl.href
  }

  const { href } = router.resolve(to)
  if (isHistoryMode) {
    return new URL(href, baseUrl).href
  }

  baseUrl.hash = href
  return baseUrl.href
}
