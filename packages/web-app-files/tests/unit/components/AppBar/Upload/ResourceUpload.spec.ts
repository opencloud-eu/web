import { mockDeep } from 'vitest-mock-extended'
import ResourceUpload from '../../../../../src/components/AppBar/Upload/ResourceUpload.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { UppyService } from '@opencloud-eu/web-pkg'
import { OcButton } from '@opencloud-eu/design-system/components'

describe('Resource Upload Component', () => {
  describe('file upload', () => {
    it('should render component', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })

  describe('folder upload', () => {
    it('should render component', () => {
      const { wrapper } = getWrapper({ isFolder: true })
      expect(wrapper.exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })

  describe('when upload file button is clicked', () => {
    it('should call "triggerUpload"', async () => {
      const { wrapper } = getWrapper()

      const uploadButton = wrapper.find('button')
      const fileUploadInput = wrapper.find('#files-file-upload-input')

      const clickMock = vi.fn()
      ;(fileUploadInput.element as HTMLElement).click = clickMock

      await uploadButton.trigger('click')

      expect(clickMock).toHaveBeenCalledTimes(1)
      expect((fileUploadInput.element as HTMLElement).click).toHaveBeenCalledTimes(1)
    })
  })

  it('should be disabled when a remote upload is running', () => {
    const uppyService = mockDeep<UppyService>()
    uppyService.isRemoteUploadInProgress.mockReturnValue(true)
    const { wrapper } = getWrapper({ isFolder: true }, uppyService)
    expect(wrapper.findComponent<typeof OcButton>('button').props('disabled')).toBeTruthy()
  })
})

function getWrapper(props = {}, uppyService = mockDeep<UppyService>()) {
  const mocks = {
    ...defaultComponentMocks(),
    $uppyService: uppyService
  }
  return {
    mocks,
    wrapper: shallowMount(ResourceUpload, {
      props,
      global: {
        mocks,
        stubs: { OcButton: false },
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
