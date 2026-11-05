import FilePickerModal from '../../../../src/components/Modals/FilePickerModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Modal, useModals, WebThemeType } from '../../../../src/composables/piniaStores'
import { RouteLocation } from 'vue-router'

describe('FilePickerModal', () => {
  describe('iframe', () => {
    it('sets the iframe src correctly', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.vm.iframeSrc).toEqual(
        'http://localhost:3000/files-spaces-generic?hide-logo=true&embed=true&embed-target=file&embed-delegate-authentication=false&embed-file-types=text%2Frtf'
      )
    })
    it('sets the iframe title correctly', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.vm.iframeTitle).toEqual('OpenCloud')
    })
  })
  describe('method "onFilePick"', () => {
    it('does nothing if the event message does not equal "opencloud-embed:file-pick"', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.onFilePick(createMessageEvent(wrapper, { data: { name: 'some-other-event' } }))
      expect(wrapper.vm.callbackFn).not.toHaveBeenCalled()
    })
    it('calls callback function when message does equal "opencloud-embed:file-pick"', () => {
      const { wrapper } = getWrapper()
      const modalStore = useModals()
      wrapper.vm.onFilePick(
        createMessageEvent(wrapper, {
          data: {
            name: 'opencloud-embed:file-pick',
            data: {
              resource: mock<Resource>({ storageId: '1' }),
              originRoute: mock<RouteLocation>()
            }
          }
        })
      )
      expect(wrapper.vm.callbackFn).toHaveBeenCalled()
      expect(modalStore.removeModal).toHaveBeenCalled()
    })
  })
  describe('message sender verification', () => {
    it.each([
      { source: {}, origin: 'http://localhost:3000' },
      { source: undefined, origin: 'http://attacker.example' }
    ])(
      'ignores "opencloud-embed:file-pick" messages not sent by the picker iframe (%o)',
      async ({ source, origin }) => {
        const { wrapper } = getWrapper()
        const modalStore = useModals()
        await wrapper.vm.onFilePick(
          createMessageEvent(
            wrapper,
            {
              data: {
                name: 'opencloud-embed:file-pick',
                data: { resource: mock<Resource>({ storageId: '1' }) }
              }
            },
            { source, origin }
          )
        )
        expect(wrapper.vm.callbackFn).not.toHaveBeenCalled()
        expect(modalStore.removeModal).not.toHaveBeenCalled()
      }
    )
    it.each([
      { source: {}, origin: 'http://localhost:3000' },
      { source: undefined, origin: 'http://attacker.example' }
    ])(
      'ignores "opencloud-embed:cancel" messages not sent by the picker iframe (%o)',
      ({ source, origin }) => {
        const { wrapper } = getWrapper()
        const modalStore = useModals()
        wrapper.vm.onCancel(
          createMessageEvent(
            wrapper,
            { data: { name: 'opencloud-embed:cancel' } },
            { source, origin }
          )
        )
        expect(modalStore.removeModal).not.toHaveBeenCalled()
      }
    )
    it('closes the modal on "opencloud-embed:cancel" sent by the picker iframe', () => {
      const { wrapper } = getWrapper()
      const modalStore = useModals()
      wrapper.vm.onCancel(createMessageEvent(wrapper, { data: { name: 'opencloud-embed:cancel' } }))
      expect(modalStore.removeModal).toHaveBeenCalled()
    })
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks()

  const wrapper = shallowMount(FilePickerModal, {
    props: {
      modal: mock<Modal>(),
      resource: mock<Resource>(),
      allowedFileTypes: ['text/rtf'],
      callbackFn: vi.fn(),
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
  Object.defineProperty(wrapper.find('iframe').element, 'contentWindow', { value: {} })

  return { mocks, wrapper }
}

function createMessageEvent(
  wrapper: ReturnType<typeof getWrapper>['wrapper'],
  { data }: { data: unknown },
  { source, origin = 'http://localhost:3000' }: { source?: unknown; origin?: string } = {}
) {
  const event = new MessageEvent('message', { data, origin })
  Object.defineProperty(event, 'source', {
    value: source === undefined ? wrapper.find('iframe').element.contentWindow : source
  })
  return event
}
