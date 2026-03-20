import { computed } from 'vue'
import SpaceHeader from '../../../../src/components/Spaces/SpaceHeader.vue'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { SpaceResource, Resource, buildSpaceImageResource } from '@opencloud-eu/web-client'
import { defaultPlugins, mount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'
import { flushPromises } from '@vue/test-utils'
import { useSideBar } from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn().mockReturnValue({
    getDefaultAction: vi.fn().mockReturnValue({ handler: vi.fn() })
  }),
  useLoadPreview: vi.fn().mockReturnValue({
    loadPreview: vi.fn(() => 'blob:image')
  })
}))

vi.mock('@opencloud-eu/editor', () => ({
  useTextEditor: vi.fn().mockReturnValue({
    editor: { value: null },
    contentType: { value: 'markdown' },
    readonly: { value: true },
    toolbarItems: [],
    getContent: vi.fn().mockReturnValue(''),
    setContent: vi.fn(),
    isEmpty: { value: true },
    isFocused: { value: false },
    focus: vi.fn(),
    blur: vi.fn(),
    destroy: vi.fn()
  }),
  TextEditorProvider: { template: '<div><slot /></div>' },
  TextEditorContent: { template: '<div />' }
}))

vi.mock('@opencloud-eu/web-client', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  buildSpaceImageResource: vi.fn()
}))

vi.mock('@opencloud-eu/design-system/composables', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@opencloud-eu/design-system/composables')>()
  return {
    ...actual,
    useIsMobile: vi.fn()
  }
})

const getSpaceMock = (spaceImageData: DriveItem = undefined) =>
  mock<SpaceResource>({
    id: '1',
    name: 'space',
    description: '',
    spaceReadmeData: undefined,
    canEditReadme: () => true,
    spaceImageData
  })

describe('SpaceHeader', () => {
  it('should add the "squashed"-class when the sidebar is opened', async () => {
    const wrapper = getWrapper({ space: getSpaceMock(), isSideBarOpen: true })
    await flushPromises()
    expect(wrapper.find('.space-header-squashed').exists()).toBeTruthy()
    expect(wrapper.html()).toMatchSnapshot()
  })
  describe('space image', () => {
    it('should show the set image', async () => {
      const wrapper = getWrapper({ space: getSpaceMock({ webDavUrl: '/' }) })
      await flushPromises()
      expect(wrapper.find('.space-header-image img').exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('should take full width in mobile view', () => {
      const wrapper = getWrapper({
        space: getSpaceMock({ webDavUrl: '/' }),
        isMobile: true
      })
      expect(wrapper.find('.space-header').attributes('class')).not.toContain('flex')
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
      await flushPromises()
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
  describe('space member count', () => {
    it('should show the correct amount of space members', async () => {
      const space = getSpaceMock()
      space.spaceReadmeData = {}
      const wrapper = getWrapper({ space, memberCount: 5 })
      await flushPromises()
      expect(wrapper.find('.space-header-people-count').text()).toContain('5')
    })
  })
})

function getWrapper({
  space = {} as SpaceResource,
  isSideBarOpen = false,
  isMobile = false,
  imagesLoading = [],
  readmesLoading = [],
  memberCount = 0
}: {
  space?: SpaceResource
  isSideBarOpen?: boolean
  isMobile?: boolean
  imagesLoading?: string[]
  readmesLoading?: string[]
  memberCount?: number
}) {
  const mocks = defaultComponentMocks()
  mocks.$previewService.loadPreview.mockResolvedValue('blob:image')
  vi.mocked(buildSpaceImageResource).mockReturnValue(mock<Resource>())

  mocks.$clientService.webdav.getFileContents.mockResolvedValue(
    mock<GetFileContentsResponse>({ body: 'body' })
  )
  mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>())
  mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
    shares: [],
    allowedActions: [],
    allowedRoles: [],
    count: memberCount
  })

  const plugins = [
    ...defaultPlugins({ piniaOptions: { spacesState: { imagesLoading, readmesLoading } } })
  ]

  vi.mocked(useIsMobile).mockReturnValue({ isMobile: computed(() => isMobile) })

  const sideBarStore = useSideBar()
  sideBarStore.isSideBarOpen = isSideBarOpen

  return mount(SpaceHeader, {
    props: {
      space
    },
    global: {
      mocks,
      plugins,
      provide: { ...mocks },
      stubs: {
        'space-context-actions': true,
        TextEditorProvider: true,
        TextEditorContent: true
      }
    }
  })
}
