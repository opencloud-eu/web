import SaveAsModal from '../../../../src/components/Modals/SaveAsModal.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  nextTicks,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ListFilesResult } from '@opencloud-eu/web-client/webdav'
import {
  Modal,
  useMessages,
  useModals,
  WebThemeType
} from '../../../../src/composables/piniaStores'
import { ClientService } from '../../../../src'

window.open = vi.fn()

describe('SaveAsModal', () => {
  describe('iframe', () => {
    it('sets the iframe src correctly', () => {
      const { wrapper } = getWrapper()
      expect((wrapper.vm as any).iframeUrl.href).toEqual(
        'http://localhost:3000/files-spaces-generic?hide-logo=true&embed=true&embed-target=location&embed-choose-file-name=true&embed-delegate-authentication=false&embed-choose-file-name-suggestion=test.txt'
      )
    })
    it('sets the iframe title correctly', () => {
      const { wrapper } = getWrapper()
      expect((wrapper.vm as any).iframeTitle).toEqual('OpenCloud')
    })
  })
  describe('method "onLocationPick"', () => {
    it('does nothing if the event message does not equal "opencloud-embed:select"', () => {
      const { mocks } = getWrapper()

      expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
      expect(mocks.$clientService.webdav.putFileContents).not.toHaveBeenCalled()
      expect(window.open).not.toHaveBeenCalled()
    })
    it('saves the file when message does equal "opencloud-embed:select"', async () => {
      const { wrapper, mocks } = getWrapper()
      const modalStore = useModals()
      const messageStore = useMessages()

      mocks.$clientService.webdav.putFileContents.mockResolvedValue(mock<Resource>())
      ;(wrapper.vm as any).onLocationPick(
        mock<MessageEvent>({
          data: {
            name: 'opencloud-embed:select',
            data: {
              resources: [mock<Resource>({ storageId: '1' })],
              fileName: 'test with new name.txt'
            }
          }
        })
      )

      await nextTicks(4)
      expect(messageStore.showMessage).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalled()
      expect(window.open).toHaveBeenCalled()
    })
    it('shows an error message when the file when message does equal "opencloud-embed:select and request fails"', async () => {
      console.error = vi.fn()
      const { wrapper, mocks } = getWrapper()
      const modalStore = useModals()
      const messageStore = useMessages()

      mocks.$clientService.webdav.putFileContents.mockRejectedValue(new Error(''))
      ;(wrapper.vm as any).onLocationPick(
        mock<MessageEvent>({
          data: {
            name: 'opencloud-embed:select',
            data: {
              resources: [mock<Resource>({ storageId: '1' })],
              fileName: 'test with new name.txt'
            }
          }
        })
      )

      await nextTicks(4)
      expect(messageStore.showErrorMessage).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalled()
      expect(window.open).not.toHaveBeenCalled()
    })
    it('encodes hash character in file path without double encoding when opening saved file', async () => {
      const { wrapper, mocks } = getWrapper({
        spaceMock: mock<SpaceResource>({
          id: '1',
          // getDriveAliasAndItem returns unencoded path (like the real implementation)
          getDriveAliasAndItem: () => 'personal/admin/ticket#1234.txt'
        })
      })

      mocks.$clientService.webdav.putFileContents.mockResolvedValue(
        mock<Resource>({
          path: '/ticket#1234.txt',
          name: 'ticket#1234.txt',
          fileId: 'file-123'
        })
      )

      vi.mocked(window.open).mockClear()
      ;(wrapper.vm as any).onLocationPick(
        mock<MessageEvent>({
          data: {
            name: 'opencloud-embed:select',
            data: {
              resources: [mock<Resource>({ storageId: '1' })],
              fileName: 'ticket#1234.txt',
              locationQuery: {}
            }
          }
        })
      )

      await nextTicks(4)
      const calls = vi.mocked(window.open).mock.calls
      expect(calls).toHaveLength(1)
      const url = calls[0][0] as string

      // Extract pathname from URL (before the query string)
      const pathname = url.split('?')[0]

      // Check that hash in pathname is encoded exactly once
      expect(pathname).toContain('ticket%231234.txt')
      // Ensure the pathname doesn't have double encoded hash
      expect(pathname).not.toContain('ticket%2523')
    })
  })
})

function getWrapper({
  spaceMock = mock<SpaceResource>({
    id: '1',
    getDriveAliasAndItem: () => 'personal/admin/test.txt'
  })
}: { spaceMock?: SpaceResource } = {}) {
  const $clientService = mockDeep<ClientService>()
  const mocks = { ...defaultComponentMocks(), $clientService }
  mocks.$clientService.webdav.listFiles.mockResolvedValue(mock<ListFilesResult>({ children: [] }))

  return {
    mocks,
    wrapper: shallowMount(SaveAsModal, {
      props: {
        modal: mock<Modal>(),
        content: 'some text',
        originalResource: { id: '1', path: '/test.txt', name: 'test.txt', extension: 'txt' },
        parentFolderLink: {
          name: 'files-spaces-generic',
          params: {
            driveAliasAndItem: 'personal/admin'
          },
          query: {
            fileId:
              '61dcd768-0bc4-4dd5-975a-2fe2bc9bc664$f1e4f3ec-1f24-460d-9f9a-4416ab6ddb6b!36cce768-8c9d-45e4-9c7d-4c9611962a75'
          }
        }
      },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              spacesState: {
                spaces: [spaceMock]
              },
              themeState: { currentTheme: { name: 'OpenCloud' } as WebThemeType }
            }
          })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
