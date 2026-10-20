import { mock } from 'vitest-mock-extended'
import { buildRoutes } from '../../../src/router/guest'
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
