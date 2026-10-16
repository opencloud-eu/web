import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useResourceRouteResolver } from '../../../../src/composables/filesList/useResourceRouteResolver'

describe('useResourceRouteResolver', () => {
  describe('createFolderLink', () => {
    it('links to the generic spaces route', () => {
      getWrapper({
        setup: ({ createFolderLink }) => {
          const link = createFolderLink({ path: '/folder', resource: mock<Resource>() })
          expect(link).toMatchObject({ name: 'files-spaces-generic' })
        }
      })
    })
    it('links to the guest route in a guest context', () => {
      getWrapper({
        isGuest: true,
        setup: ({ createFolderLink }) => {
          const link = createFolderLink({ path: '/folder', resource: mock<Resource>() })
          expect(link).toMatchObject({ name: 'files-guest-link' })
        }
      })
    })
  })
})

function getWrapper({
  setup,
  isGuest = false
}: {
  setup: (instance: ReturnType<typeof useResourceRouteResolver>) => void
  isGuest?: boolean
}) {
  const mocks = defaultComponentMocks()
  const space = mock<SpaceResource>({
    driveType: 'share',
    getDriveAliasAndItem: () => 'share/folder'
  })
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useResourceRouteResolver({ space: ref(space) })
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
