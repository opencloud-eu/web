import { useFileActionsSetImage, useModals } from '../../../../../src'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { useSpaceHelpers } from '../../../../../src/composables/spaces/useSpaceHelpers'

vi.mock('../../../../../src/composables/spaces/useSpaceHelpers', () => ({
  useSpaceHelpers: vi.fn()
}))

describe('setImage', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      const space = mock<SpaceResource>({ canEditImage: () => true })

      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ space, resources: [] as Resource[] })).toBe(false)
        }
      })
    })
    it('should be false when canEditImage is false', () => {
      const space = mock<SpaceResource>({ canEditImage: () => false })
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              space,
              resources: [{ id: '1', mimeType: 'image/png' }] as Resource[]
            })
          ).toBe(false)
        }
      })
    })
    it.each(['personal', 'share'])('should be false when space is of type %s', (driveType) => {
      const space = mock<SpaceResource>({ canEditImage: () => true, driveType })

      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ space, resources: [space] })).toBe(false)
        }
      })
    })
  })

  describe('handler', () => {
    it('should create a modal', () => {
      const space = mock<SpaceResource>({ id: '1' })

      getWrapper({
        setup: async ({ actions }, { clientService }) => {
          clientService.webdav.getFileContents.mockResolvedValue({ body: new Blob() })
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({
            space,
            resources: [
              {
                webDavPath: '/spaces/1fe58d8b-aa69-4c22-baf7-97dd57479f22/subfolder/image.png',
                name: 'image.png'
              }
            ] as Resource[]
          })
          expect(dispatchModal).toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useFileActionsSetImage>,
    options: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  vi.mocked(useSpaceHelpers).mockReturnValue({
    getDefaultMetaFolder: () => new Promise(() => mock<Resource>())
  })

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }
  mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>())

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsSetImage()
        setup(instance, { clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            userState: { user: { id: '1', onPremisesSamAccountName: 'alice' } as User }
          }
        }
      }
    )
  }
}
