import CreateOrUploadMenu from '../../../src/components/CreateOrUploadMenu.vue'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import {
  FileAction,
  useFileActionsCreateNewFile,
  useFileActionsCreateNewFolder,
  useFileActionsCreateNewShortcut,
  useExtensionRegistry,
  Extension
} from '@opencloud-eu/web-pkg'
import { defaultPlugins, shallowMount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { computed } from 'vue'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActionsCreateNewFile: vi.fn(),
  useFileActionsCreateNewFolder: vi.fn(),
  useFileActionsCreateNewShortcut: vi.fn()
}))

const elSelector = {
  uploadBtn: '#upload-list',
  resourceUpload: 'resource-upload-stub',
  newFolderBtn: '#new-folder-btn',
  newShortcutBtn: '#new-shortcut-btn',
  extensionList: '#extension-list'
}

describe('CreateOrUploadMenu component', () => {
  describe('action buttons', () => {
    it('should show and be enabled if file creation is possible', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(elSelector.uploadBtn)).toBeTruthy()
      expect(wrapper.find(elSelector.newFolderBtn).exists()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })

  describe('file handlers', () => {
    it('should always show for uploading files and folders', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.findAll(elSelector.resourceUpload).length).toBe(2)
    })

    it('should show entries for all new file handlers', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
})

function getWrapper({
  currentFolder = mock<Resource>({ canUpload: () => true }),
  areFileExtensionsShown = false,
  createActions = [
    mock<FileAction>({ label: () => 'Plain text file', ext: 'txt', isExternal: false }),
    mock<FileAction>({ label: () => 'Mark-down file', ext: 'md', isExternal: false })
  ],
  extensionActions = [],
  createFolderHandler = vi.fn(),
  createShortcutHandler = vi.fn()
}: {
  currentFolder?: Resource
  areFileExtensionsShown?: boolean
  createActions?: FileAction[]
  extensionActions?: Extension[]
  createFolderHandler?: () => void
  createShortcutHandler?: () => void
} = {}) {
  const plugins = defaultPlugins({
    piniaOptions: {
      resourcesStore: { areFileExtensionsShown, currentFolder }
    }
  })

  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockReturnValue(extensionActions)

  vi.mocked(useFileActionsCreateNewFile).mockReturnValue({
    actions: computed(() => createActions)
  } as any)

  vi.mocked(useFileActionsCreateNewFolder).mockReturnValue({
    actions: computed(() => [
      mock<FileAction>({
        handler: createFolderHandler
      })
    ])
  } as any)

  vi.mocked(useFileActionsCreateNewShortcut).mockReturnValue({
    actions: computed(() => [
      mock<FileAction>({
        handler: createShortcutHandler
      })
    ])
  } as any)

  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(CreateOrUploadMenu, {
      props: {
        toggle: '#test-toggle'
      },
      global: {
        renderStubDefaultSlot: true,
        mocks,
        provide: mocks,
        plugins
      }
    })
  }
}
