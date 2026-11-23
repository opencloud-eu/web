import { unref } from 'vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ClientService } from '@opencloud-eu/web-pkg'
import { useFileActions, useMessages } from '@opencloud-eu/web-pkg'
import { useSpaceActionsEditReadmeContent } from '../../../../../src/composables/actions/spaces'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn()
}))

describe('editReadmeContent', () => {
  describe('isVisible property', () => {
    it('should be true if canEditReadme is true', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canEditReadme: () => true })

      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [spaceMock]
            })
          ).toBe(true)
        }
      })
    })
    it('should be false when not resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false if canEditReadme is false', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canEditReadme: () => false })

      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [spaceMock]
            })
          ).toBe(false)
        }
      })
    })
  })
  describe('method "handler"', () => {
    it('opens the readme a space already has', async () => {
      const readme = mock<Resource>({ id: 'readme-id' })
      const { instance, mocks } = getWrapper()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(readme)

      await unref(instance.actions)[0].handler({ resources: [spaceWithReadme] })

      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalledWith(spaceWithReadme, {
        path: '.space/readme.md'
      })
      expect(mocks.clientService.webdav.putFileContents).not.toHaveBeenCalled()
      expect(mocks.triggerDefaultAction).toHaveBeenCalledWith({
        space: spaceWithReadme,
        resources: [readme]
      })
    })

    it('opens an on-disk readme that the drive does not know about', async () => {
      const readme = mock<Resource>({ id: 'readme-id' })
      const space = mock<SpaceResource>({ id: '1', name: 'space', spaceReadmeData: undefined })
      const { instance, mocks } = getWrapper()
      mocks.clientService.webdav.getFileInfo.mockResolvedValue(readme)

      await unref(instance.actions)[0].handler({ resources: [space] })

      expect(mocks.clientService.webdav.getFileInfo).toHaveBeenCalledWith(space, {
        path: '.space/readme.md'
      })
      expect(mocks.clientService.webdav.putFileContents).not.toHaveBeenCalled()
      expect(mocks.triggerDefaultAction).toHaveBeenCalledWith({ space, resources: [readme] })
    })

    it('creates a readme for a space that has none yet', async () => {
      const readme = mock<Resource>({ id: 'readme-id' })
      const space = mock<SpaceResource>({ id: '1', name: 'space', spaceReadmeData: undefined })
      const { instance, mocks } = getWrapper()
      mocks.clientService.webdav.getFileInfo.mockRejectedValue(
        mock<Error>({ statusCode: 404 } as any)
      )
      mocks.clientService.webdav.listFiles.mockResolvedValue({ children: [] } as any)
      mocks.clientService.webdav.createFolder.mockResolvedValue(mock<Resource>({ id: 'meta' }))
      mocks.clientService.webdav.putFileContents.mockResolvedValue(readme)

      await unref(instance.actions)[0].handler({ resources: [space] })

      expect(mocks.clientService.webdav.putFileContents).toHaveBeenCalledWith(
        space,
        expect.objectContaining({ fileName: 'readme.md' })
      )
      expect(mocks.triggerDefaultAction).toHaveBeenCalledWith({ space, resources: [readme] })
    })

    it('shows an error message when loading the readme fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let instance: ReturnType<typeof useSpaceActionsEditReadmeContent>
      const { mocks } = getWrapper({ setup: (i) => (instance = i) })
      mocks.clientService.webdav.getFileInfo.mockRejectedValue(
        mock<Error>({ statusCode: 500 } as any)
      )

      await unref(instance.actions)[0].handler({ resources: [spaceWithReadme] })

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to open space description' })
      )
      expect(mocks.clientService.webdav.putFileContents).not.toHaveBeenCalled()
      expect(mocks.triggerDefaultAction).not.toHaveBeenCalled()
    })
  })
})

const spaceWithReadme = mock<SpaceResource>({
  id: '1',
  name: 'space',
  spaceReadmeData: { webDavUrl: 'https://host/dav/spaces/1/.space/readme.md' }
})

function getWrapper({
  setup,
  triggerDefaultAction = vi.fn()
}: {
  setup?: (instance: ReturnType<typeof useSpaceActionsEditReadmeContent>) => void
  triggerDefaultAction?: () => void
} = {}) {
  vi.mocked(useFileActions).mockReturnValue(
    mock<ReturnType<typeof useFileActions>>({
      triggerDefaultAction
    })
  )

  const clientService = mockDeep<ClientService>()
  clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(mock<SpaceResource>())
  const mocks = { triggerDefaultAction, clientService }

  let instance: ReturnType<typeof useSpaceActionsEditReadmeContent>
  const wrapper = getComposableWrapper(
    () => {
      instance = useSpaceActionsEditReadmeContent()
      setup?.(instance)
    },
    {
      provide: { $clientService: clientService },
      pluginOptions: {
        piniaOptions: {
          userState: { user: { id: '1', onPremisesSamAccountName: 'alice' } as User }
        }
      }
    }
  )
  return { wrapper, instance, mocks }
}
