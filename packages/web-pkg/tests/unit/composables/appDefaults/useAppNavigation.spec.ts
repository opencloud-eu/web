import { defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { useAppNavigation } from '../../../../src/composables/appDefaults/useAppNavigation'
import { FileContext } from '../../../../src/composables/appDefaults/types'
import { SpaceResource } from '@opencloud-eu/web-client'

describe('useAppNavigation', () => {
  describe('closeApp', () => {
    it('navigates to the root if no context route name is given', () => {
      const { router } = createSetup({})
      const currentFileContext = { ...createFileContext({}), routeName: '' }
      const { closeApp } = useAppNavigation({ router, currentFileContext })

      closeApp()

      expect(router.push).toHaveBeenCalledWith({ path: '/' })
    })

    it('passes the resource id (not the file name) as "scrollTo" so the file list can scroll back to it', () => {
      const { router } = createSetup({})
      const { closeApp } = useAppNavigation({
        router,
        currentFileContext: createFileContext({ itemId: 'file-id', fileName: 'example.txt' })
      })

      closeApp()

      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'files-spaces-generic',
          query: expect.objectContaining({ scrollTo: 'file-id' })
        })
      )
    })
  })
})

function createSetup({}: Record<string, never>) {
  const mocks = defaultComponentMocks()
  return { router: mocks.$router }
}

function createFileContext({
  itemId = 'file-id',
  fileName = 'example.txt',
  routeName = 'files-spaces-generic'
}: {
  itemId?: string
  fileName?: string
  routeName?: string
}): FileContext {
  return {
    path: '/example.txt',
    driveAliasAndItem: 'personal/admin/example.txt',
    space: {} as SpaceResource,
    item: '/example.txt',
    itemId,
    fileName,
    routeName,
    routeParams: { driveAliasAndItem: 'personal/admin/example.txt' },
    routeQuery: {}
  }
}
