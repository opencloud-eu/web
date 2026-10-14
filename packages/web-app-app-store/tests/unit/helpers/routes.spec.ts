import { createMemoryHistory, createRouter } from 'vue-router'
import { mock } from 'vitest-mock-extended'
import { getAppDetailsRoute } from '../../../src/helpers'
import { APPID } from '../../../src/appid'
import { App } from '../../../src/types'

describe('getAppDetailsRoute', () => {
  it.each(['com.example.app', 'a/b', 'a#b', 'a?b', '50%-off', 'a b'])(
    'resolves the app id "%s" from its link',
    (id) => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/app-store/app/:appId', name: `${APPID}-details`, component: {} }]
      })
      const { href } = router.resolve(getAppDetailsRoute(mock<App>({ id })))
      expect(router.resolve(href).params.appId).toBe(id)
    }
  )
})
