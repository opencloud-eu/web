import { mock } from 'vitest-mock-extended'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { FolderLoaderSharedWithMe } from '../../../../../src/services/folder'

describe('FolderLoaderSharedWithMe', () => {
  describe('isActive', () => {
    it.each(['files-shares-with-me', 'files-guest-shares'])('is active on route "%s"', (name) => {
      const { $router } = defaultComponentMocks({
        currentRoute: mock<RouteLocationNormalizedLoaded>({ name })
      })
      expect(new FolderLoaderSharedWithMe().isActive($router)).toBeTruthy()
    })
    it.each(['files-shares-with-me', 'files-guest-shares'])(
      'is active if the context route is "%s"',
      (contextRouteName) => {
        const { $router } = defaultComponentMocks({
          currentRoute: mock<RouteLocationNormalizedLoaded>({
            name: 'some-app',
            query: { contextRouteName }
          })
        })
        expect(new FolderLoaderSharedWithMe().isActive($router)).toBeTruthy()
      }
    )
    it('is not active on other routes', () => {
      const { $router } = defaultComponentMocks({
        currentRoute: mock<RouteLocationNormalizedLoaded>({ name: 'files-guest-link', query: {} })
      })
      expect(new FolderLoaderSharedWithMe().isActive($router)).toBeFalsy()
    })
  })
})
