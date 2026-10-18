import { unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileActionsNavigate } from '../../../../src/composables/actions/useFileActionsNavigate'

describe('navigate', () => {
  describe('route', () => {
    it('targets the generic spaces route', () => {
      getWrapper({
        setup: ({ actions }) => {
          const route = unref(actions)[0].route({ space: getSpace(), resources: getResources() })
          expect(route).toMatchObject({ name: 'files-spaces-generic' })
        }
      })
    })
    it('targets the guest route in a guest context, also from hybrid routes', () => {
      getWrapper({
        isGuest: true,
        routeName: 'preview',
        setup: ({ actions }) => {
          const route = unref(actions)[0].route({ space: getSpace(), resources: getResources() })
          expect(route).toMatchObject({ name: 'files-guest-link' })
        }
      })
    })
  })
})

function getSpace() {
  return mock<SpaceResource>({ getDriveAliasAndItem: () => 'share/folder' })
}

function getResources() {
  return [mock<Resource>({ path: '/folder', fileId: 'file-id', isFolder: true })]
}

function getWrapper({
  setup,
  isGuest = false,
  routeName = ''
}: {
  setup: (instance: ReturnType<typeof useFileActionsNavigate>) => void
  isGuest?: boolean
  routeName?: string
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocationNormalizedLoaded>({ name: routeName, path: '' })
  })
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsNavigate()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { authState: { guestContextReady: isGuest } } }
      }
    )
  }
}
