import LocationPickerModal from '../../../../src/components/Modals/LocationPickerModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Modal, useModals, WebThemeType } from '../../../../src/composables/piniaStores'

describe('LocationPickerModal', () => {
  describe('iframe', () => {
    it('sets the iframe src correctly', () => {
      const { wrapper } = getWrapper()
      expect((wrapper.vm as any).iframeSrc).toEqual(
        'http://localhost:3000/files-spaces-generic?hide-logo=true&embed=true&embed-target=location&embed-delegate-authentication=false'
      )
    })
    it('sets the iframe title correctly', () => {
      const { wrapper } = getWrapper()
      expect((wrapper.vm as any).iframeTitle).toEqual('OpenCloud')
    })
    it('sets a custom submit button title in iframe src when provided', () => {
      const { wrapper } = getWrapper({ submitButtonTitle: 'Move here' })
      expect((wrapper.vm as any).iframeSrc).toEqual(
        'http://localhost:3000/files-spaces-generic?hide-logo=true&embed=true&embed-target=location&embed-delegate-authentication=false&embed-submit-button-title=Move+here'
      )
    })
  })
  describe('method "onLocationPick"', () => {
    it('does nothing if the event message does not equal "opencloud-embed:select"', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).onLocationPick(
        mock<MessageEvent>({ data: { name: 'some-other-event' } })
      )
      expect((wrapper.vm as any).callbackFn).not.toHaveBeenCalled()
    })
    it('calls callback function when message does equal "opencloud-embed:select"', () => {
      const { wrapper } = getWrapper()
      const modalStore = useModals()
      ;(wrapper.vm as any).onLocationPick(
        mock<MessageEvent>({
          data: {
            name: 'opencloud-embed:select',
            data: {
              resources: [mock<Resource>({ storageId: '1' })]
            }
          }
        })
      )
      expect((wrapper.vm as any).callbackFn).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalled()
    })
    it('calls callback function for legacy array payload when message does equal "opencloud-embed:select"', () => {
      const { wrapper } = getWrapper()
      const modalStore = useModals()
      ;(wrapper.vm as any).onLocationPick(
        mock<MessageEvent>({
          data: {
            name: 'opencloud-embed:select',
            data: [mock<Resource>({ storageId: '1' })]
          }
        })
      )
      expect((wrapper.vm as any).callbackFn).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalled()
    })
  })
})

function getWrapper({ submitButtonTitle }: { submitButtonTitle?: string } = {}) {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(LocationPickerModal, {
      props: {
        modal: mock<Modal>(),
        callbackFn: vi.fn(),
        submitButtonTitle,
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
              spacesState: { spaces: [mock<SpaceResource>({ id: '1' })] },
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
