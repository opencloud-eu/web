import { unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'
import { useSpaceActionsSetIcon } from '../../../../../src/composables/actions/spaces'

describe('setIcon', () => {
  beforeEach(() => {
    const createElementMock = vi.spyOn(document, 'createElement')
    createElementMock.mockImplementation(() => {
      return {
        insertBefore: vi.fn(),
        toBlob: (callback: BlobCallback) => callback(new Blob()),
        getContext: () => ({
          fillText: vi.fn()
        })
      } as unknown as HTMLElement
    })
  })
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false when multiple resources are given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>(), mock<SpaceResource>()]
            })
          ).toBe(false)
        }
      })
    })
    it('should be false when permission is not granted', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>({ canEditImage: () => false })]
            })
          ).toBe(false)
        }
      })
    })
    it('should be true when permission is granted', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>({ driveType: 'project', canEditImage: () => true })]
            })
          ).toBe(true)
        }
      })
    })
  })
  describe('handler', () => {
    it('should trigger the setIcon modal window with one resource', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({ resources: [{ id: '1' } as SpaceResource] })

          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('should not trigger the setIcon modal window with no resource', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({ resources: [] })

          expect(dispatchModal).toHaveBeenCalledTimes(0)
        }
      })
    })
  })
  describe('method "setIconSpace"', () => {
    it('should show message on success', async () => {
      let instance: ReturnType<typeof useSpaceActionsSetIcon>
      const { mocks } = getWrapper({ setup: (i) => (instance = i) })
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>()
      )

      await instance.setIconSpace(mock<SpaceResource>(), '🐻')

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let instance: ReturnType<typeof useSpaceActionsSetIcon>
      const { mocks } = getWrapper({ setup: (i) => (instance = i) })
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())

      await instance.setIconSpace(mock<SpaceResource>(), '🐻')

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message when loading the space folder fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let instance: ReturnType<typeof useSpaceActionsSetIcon>
      const { mocks } = getWrapper({ setup: (i) => (instance = i) })
      mocks.$clientService.webdav.listFiles.mockRejectedValue(new Error())

      await instance.setIconSpace(mock<SpaceResource>(), '🐻')

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to set space icon' })
      )
      expect(mocks.$clientService.webdav.putFileContents).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsSetIcon>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
  })
  mocks.$clientService.webdav.listFiles.mockResolvedValue({
    resource: mock<Resource>(),
    children: [mock<Resource>({ id: 'meta-folder', name: '.space' })]
  })
  mocks.$clientService.webdav.putFileContents.mockResolvedValue(
    mock<Resource>({ fileId: 'image-id' })
  )

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsSetIcon()
        setup(instance, { clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
