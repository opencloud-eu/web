import { mock } from 'vitest-mock-extended'
import { RouteLocation, RouteLocationNamedRaw, Router } from 'vue-router'
import { ref } from 'vue'
import { buildRoutes, isLocationGuestLinkActive } from '../../../src/router/guest'
import { RouteComponents } from '../../../src/router/router'

describe('guest routes', () => {
  it.each(['files-guest-shares', 'files-guest-link'])(
    'route "%s" requires a guest context',
    (name) => {
      const [{ children }] = buildRoutes(mock<RouteComponents>())
      const route = children.find((r) => r.name === name)
      expect(route.meta.authContext).toBe('guest')
    }
  )
})

describe('isLocationGuestLinkActive', () => {
  const hrefs: Record<string, string> = {
    'files-guest-link': '/guest',
    'files-guest-shares': '/guest/shares'
  }

  function getRouter(path: string) {
    return mock<Router>({
      currentRoute: ref({ name: 'current', path }),
      resolve: (r: RouteLocationNamedRaw & { path?: string }) =>
        mock<RouteLocation & { href: string }>({ href: r.path ?? hrefs[r.name.toString()] })
    })
  }

  it.each([
    { path: '/guest/share/foo', expected: true },
    { path: '/guest/shares', expected: false },
    { path: '/files/spaces/personal', expected: false }
  ])('returns $expected for path "$path"', ({ path, expected }) => {
    expect(isLocationGuestLinkActive(getRouter(path))).toBe(expected)
  })
})
