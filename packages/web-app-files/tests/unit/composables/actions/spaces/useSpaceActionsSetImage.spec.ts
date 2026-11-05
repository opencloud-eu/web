import { useSpaceActionsSetImage } from '../../../../../src/composables/actions/spaces'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'

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

    it('should show an error message when loading the image fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let instance: ReturnType<typeof useSpaceActionsSetImage>
      let clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
      getWrapper({
        setup: (i, mocks) => {
          instance = i
          clientService = mocks.clientService
        }
      })
      clientService.webdav.getFileContents.mockRejectedValue(new Error())

      await unref(instance.actions)[0].handler({
        space: mock<SpaceResource>({ id: '1' }),
        resources: [{ name: 'image.png' }] as Resource[]
      })

      const { showErrorMessage } = useMessages()
      const { dispatchModal } = useModals()
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to set space image' })
      )
      expect(dispatchModal).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsSetImage>,
    options: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }
  mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>())

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsSetImage()
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
