import { ref } from 'vue'
import SpaceHeader from '../../../../src/components/Spaces/SpaceHeader.vue'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { SpaceResource, Resource, buildSpaceImageResource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn().mockReturnValue({
    getDefaultAction: vi.fn().mockReturnValue({ handler: vi.fn() })
  }),
  useLoadPreview: vi.fn().mockReturnValue({
    loadPreview: vi.fn(() => 'blob:image')
  })
}))

vi.mock('@opencloud-eu/web-client', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  buildSpaceImageResource: vi.fn()
}))

const getSpaceMock = (spaceImageData: DriveItem = undefined) =>
  mock<SpaceResource>({
    id: '1',
    name: '',
    description: '',
    spaceReadmeData: undefined,
    spaceImageData
  })

describe('SpaceHeader', () => {
  it('should add the "squashed"-class when the sidebar is opened', () => {
    const wrapper = getWrapper({ space: getSpaceMock(), isSideBarOpen: true })
    expect(wrapper.find('.space-header-squashed').exists()).toBeTruthy()
    expect(wrapper.html()).toMatchSnapshot()
  })
  describe('space image', () => {
    it('should show the default image if no other image is set', () => {
      const wrapper = getWrapper({ space: getSpaceMock() })
      expect(wrapper.find('.space-header-image-default').exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('should show the set image', async () => {
      const wrapper = getWrapper({ space: getSpaceMock({ webDavUrl: '/' }) })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.space-header-image-default').exists()).toBeFalsy()
      expect(wrapper.find('.space-header-image img').exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('should take full width in mobile view', () => {
      const wrapper = getWrapper({
        space: getSpaceMock({ webDavUrl: '/' }),
        isMobileWidth: true
      })
      expect(wrapper.find('.space-header').attributes('class')).not.toContain('oc-flex')
      expect(wrapper.find('.space-header-image').attributes('class')).toContain(
        'space-header-image-expanded'
      )
    })
    it('shows a loading spinner when the image is loading', () => {
      const space = getSpaceMock()
      const wrapper = getWrapper({ space, imagesLoading: [space.id] })
      expect(wrapper.find('.space-header-image .oc-spinner').exists()).toBeTruthy()
    })
  })
  describe('space description', () => {
    it('should show the description', async () => {
      const space = getSpaceMock()
      space.spaceReadmeData = {}
      const wrapper = getWrapper({ space })
      await nextTicks(2)
      expect(wrapper.find('.markdown-container').exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('shows a loading spinner when the description is loading', () => {
      const space = getSpaceMock()
      space.spaceReadmeData = {}
      const wrapper = getWrapper({ space, readmesLoading: [space.id] })
      expect(wrapper.find('.space-header-readme-loading').exists()).toBeTruthy()
    })
  })
})

function getWrapper({
  space = {} as SpaceResource,
  isSideBarOpen = false,
  isMobileWidth = false,
  imagesLoading = [],
  readmesLoading = []
}) {
  const mocks = defaultComponentMocks()
  mocks.$previewService.loadPreview.mockResolvedValue('blob:image')
  vi.mocked(buildSpaceImageResource).mockReturnValue(mock<Resource>())

  mocks.$clientService.webdav.getFileContents.mockResolvedValue(
    mock<GetFileContentsResponse>({ body: 'body' })
  )
  mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>())

  return mount(SpaceHeader, {
    props: {
      space,
      isSideBarOpen
    },
    global: {
      mocks,
      plugins: [
        ...defaultPlugins({ piniaOptions: { spacesState: { imagesLoading, readmesLoading } } })
      ],
      provide: { ...mocks, isMobileWidth: ref(isMobileWidth) },
      stubs: {
        'space-context-actions': true
      }
    }
  })
}
