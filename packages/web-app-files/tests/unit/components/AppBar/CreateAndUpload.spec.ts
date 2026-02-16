import CreateAndUpload from '../../../../src/components/AppBar/CreateAndUpload.vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  FileAction,
  useFileActionsCreateNewFile,
  useRequest,
  useSpacesStore,
  CapabilityStore,
  useClipboardStore,
  useFileActionsPaste,
  useExtensionRegistry,
  OcUppyFile,
  ClipboardActions,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { defaultPlugins, shallowMount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { RouteLocation } from 'vue-router'
import { computed, ref, unref } from 'vue'
import { OcButton } from '@opencloud-eu/design-system/components'
import { ListFilesResult } from '@opencloud-eu/web-client/webdav'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRequest: vi.fn(),
  useFileActionsCreateNewFile: vi.fn(),
  useFileActions: vi.fn(),
  useFileActionsPaste: vi.fn()
}))

const elSelector = {
  component: '.create-and-upload-actions',
  createOrUploadMenuBtn: '#create-or-upload-menu-btn',
  uploadBtn: '#upload-menu-btn',
  resourceUpload: 'resource-upload-stub',
  newFolderBtn: '#new-folder-btn',
  clipboardBtns: '#clipboard-btns',
  pasteFilesBtn: '.paste-files-btn',
  clearClipboardBtn: '.clear-clipboard-btn'
}

// necessary to test the drop target because it checks for this element in the DOM
document.body.innerHTML = '<div id="files-view"></div>'

describe('CreateAndUpload component', () => {
  describe('action buttons', () => {
    it('should show and be enabled if file creation is possible', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.findComponent<typeof OcButton>(elSelector.uploadBtn)).toBeTruthy()
      expect(wrapper.findComponent<typeof OcButton>(elSelector.newFolderBtn).props()).toBeTruthy()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('should be disabled if file creation is not possible', () => {
      const currentFolder = mock<Resource>({ canUpload: () => false })
      const { wrapper } = getWrapper({ currentFolder, createActions: [] })
      expect(
        wrapper.findComponent<typeof OcButton>(elSelector.createOrUploadMenuBtn).props().disabled
      ).toBeTruthy()
    })
    it('should not be visible if file creation is not possible on a public page', () => {
      const currentFolder = mock<Resource>({ canUpload: () => false })
      const { wrapper } = getWrapper({ currentFolder, currentRouteName: 'files-public-link' })
      expect(wrapper.find(elSelector.component).exists()).toBeFalsy()
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
  describe('clipboard buttons', () => {
    it('should show if clipboard is empty', () => {
      const { wrapper } = getWrapper()
      expect(
        wrapper
          .findComponent<typeof OcButton>(`${elSelector.clipboardBtns} oc-button-stub`)
          .exists()
      ).toBeFalsy()
    })
    it('should show if clipboard is not empty', () => {
      const { wrapper } = getWrapper({ clipboardResources: [mock<Resource>()] })
      expect(wrapper.findAll(`${elSelector.clipboardBtns} .oc-button`).length).toBe(2)
    })
    it('call the "paste files"-action', async () => {
      const { wrapper, mocks } = getWrapper({
        clipboardResources: [
          mock<Resource>({
            remoteItemPath: undefined
          })
        ]
      })
      await wrapper.find(elSelector.pasteFilesBtn).trigger('click')
      expect(mocks.pasteActionHandler).toHaveBeenCalled()
    })
    it('call "clear clipboard"-action', async () => {
      const { wrapper } = getWrapper({ clipboardResources: [mock<Resource>()] })
      await wrapper.find(elSelector.clearClipboardBtn).trigger('click')
      const clipboardStore = useClipboardStore()
      expect(clipboardStore.clearClipboard).toHaveBeenCalled()
    })
    it('should disable the "paste files"-action when clipboardResources are from same folder for cut action', () => {
      const { wrapper } = getWrapper({
        clipboardResources: [mock<Resource>({ parentFolderId: 'current-folder' })],
        currentFolder: mock<Resource>({
          id: 'current-folder',
          canUpload: vi.fn().mockReturnValue(true)
        })
      })
      const pasteBtn = wrapper.findComponent<typeof OcButton>(elSelector.pasteFilesBtn)
      expect(pasteBtn.props('disabled')).toStrictEqual(true)
    })
    it('should not disable the "paste files"-action when clipboardResources are from same folder for copy action', () => {
      const { wrapper } = getWrapper({
        clipboardResources: [mock<Resource>({ parentFolderId: 'current-folder' })],
        clipboardAction: ClipboardActions.Copy,
        currentFolder: mock<Resource>({
          id: 'current-folder',
          canUpload: vi.fn().mockReturnValue(true)
        })
      })
      const pasteBtn = wrapper.findComponent<typeof OcButton>(elSelector.pasteFilesBtn)
      expect(pasteBtn.props('disabled')).toStrictEqual(false)
    })

    it('should not disable the "paste files"-action when at least one clipboardResources is not from same folder', () => {
      const { wrapper } = getWrapper({
        clipboardResources: [
          mock<Resource>({ parentFolderId: 'current-folder' }),
          mock<Resource>({ parentFolderId: 'another-folder' })
        ],
        currentFolder: mock<Resource>({
          id: 'current-folder',
          canUpload: vi.fn().mockReturnValue(true)
        })
      })
      expect(
        wrapper.findComponent<typeof OcButton>(elSelector.pasteFilesBtn).vm.disabled
      ).toStrictEqual(false)
    })
  })
  describe('method "onUploadComplete"', () => {
    it.each([
      { driveType: 'personal', updated: 1 },
      { driveType: 'project', updated: 1 },
      { driveType: 'share', updated: 0 },
      { driveType: 'public', updated: 0 }
    ])('updates the space quota for supported drive types: %s', async ({ driveType, updated }) => {
      const file = mock<OcUppyFile>({
        meta: { driveType, spaceId: '1', relativeFolder: undefined }
      })
      const spaces = [
        mock<SpaceResource>({ id: file.meta.spaceId, isOwner: () => driveType === 'personal' })
      ]
      const { mocks } = getWrapper({ spaces })
      const graphMock = mocks.$clientService.graphAuthenticated
      graphMock.drives.getDrive.mockResolvedValue(mock<SpaceResource>())
      await unref(mocks.onUploadCompleteCallback)({ successful: [file], failed: [] })
      const spacesStore = useSpacesStore()
      expect(spacesStore.updateSpaceField).toHaveBeenCalledTimes(updated)
    })

    const itemId = 'itemId'
    const space = mock<SpaceResource>({ id: '1' })
    const file = mock<OcUppyFile>({
      meta: {
        driveType: 'project',
        spaceId: space.id,
        currentFolderId: itemId,
        relativeFolder: undefined
      }
    })

    it('updates the store with the new files', async () => {
      const currentFolder = mock<Resource>({ id: itemId })
      const uploadedFile = mock<Resource>({ id: '2' })
      const { mocks } = getWrapper({ itemId, space, currentFolder, uploadedFiles: [uploadedFile] })
      const graphMock = mocks.$clientService.graphAuthenticated
      graphMock.drives.getDrive.mockResolvedValue(mock<SpaceResource>())
      await unref(mocks.onUploadCompleteCallback)({ successful: [file] })
      const resourcesStore = useResourcesStore()
      expect(resourcesStore.upsertResources).toHaveBeenCalledWith([uploadedFile])
    })
    it('does not update the store if no current folder given', async () => {
      const currentFolder = mock<Resource>({ id: '2' })
      const { mocks } = getWrapper({ itemId, space, currentFolder })
      const graphMock = mocks.$clientService.graphAuthenticated
      graphMock.drives.getDrive.mockResolvedValue(mock<SpaceResource>())
      const resourcesStore = useResourcesStore()
      resourcesStore.currentFolder = null
      await unref(mocks.onUploadCompleteCallback)({ successful: [file] })
      expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
    })
    it('does not update the store if user navigated into another space after the upload', async () => {
      const currentFolder = mock<Resource>({ id: '2' })
      const { mocks } = getWrapper({ itemId, space, currentFolder })
      const graphMock = mocks.$clientService.graphAuthenticated
      graphMock.drives.getDrive.mockResolvedValue(mock<SpaceResource>())
      const uploadedFile = { ...file }
      uploadedFile.meta.spaceId = 'another-space'
      await unref(mocks.onUploadCompleteCallback)({ successful: [uploadedFile] })
      const resourcesStore = useResourcesStore()
      expect(resourcesStore.upsertResources).not.toHaveBeenCalled()
    })
  })
  describe('drop target', () => {
    it('is being initialized when user can upload', () => {
      const { mocks } = getWrapper()
      expect(mocks.$uppyService.useDropTarget).toHaveBeenCalled()
    })
    it('is not being initialized when user can not upload', () => {
      const currentFolder = mock<Resource>({ canUpload: () => false })
      const { mocks } = getWrapper({ currentFolder })
      expect(mocks.$uppyService.useDropTarget).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  clipboardResources = [],
  files = [],
  currentFolder = mock<Resource>({ canUpload: () => true }),
  currentRouteName = 'files-spaces-generic',
  space = mock<SpaceResource>(),
  spaces = [],
  itemId = undefined,
  areFileExtensionsShown = false,
  createActions = [
    mock<FileAction>({ label: () => 'Plain text file', ext: 'txt' }),
    mock<FileAction>({ label: () => 'Mark-down file', ext: 'md' }),
    mock<FileAction>({ label: () => 'Draw.io document', ext: 'drawio' })
  ],
  clipboardAction = ClipboardActions.Cut,
  uploadedFiles = []
}: {
  clipboardResources?: Resource[]
  files?: Resource[]
  currentFolder?: Resource
  currentRouteName?: string
  space?: SpaceResource
  spaces?: SpaceResource[]
  itemId?: string
  areFileExtensionsShown?: boolean
  createActions?: FileAction[]
  clipboardAction?: ClipboardActions
  uploadedFiles?: Resource[]
} = {}) {
  const capabilities = {
    spaces: { enabled: true },
    files: { app_providers: [{ new_url: '/' }] }
  } satisfies Partial<CapabilityStore['capabilities']>

  const plugins = defaultPlugins({
    piniaOptions: {
      spacesState: { spaces },
      capabilityState: { capabilities },
      clipboardState: { resources: clipboardResources, action: clipboardAction },
      resourcesStore: { areFileExtensionsShown, currentFolder, resources: files }
    }
  })

  vi.mocked(useRequest).mockImplementation(() => ({
    makeRequest: vi.fn().mockResolvedValue({ status: 200 })
  }))
  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockReturnValue([])

  const useFileActionsCreateNewFileMock = mock<ReturnType<typeof useFileActionsCreateNewFile>>()
  useFileActionsCreateNewFileMock.actions = computed(() => createActions)
  vi.mocked(useFileActionsCreateNewFile).mockReturnValue(useFileActionsCreateNewFileMock)

  const pasteActionHandler = vi.fn()
  vi.mocked(useFileActionsPaste).mockReturnValue(
    mock<ReturnType<typeof useFileActionsPaste>>({
      actions: ref([mock<FileAction>({ handler: pasteActionHandler })])
    })
  )

  const defaultMocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: currentRouteName })
  })

  const onUploadCompleteCallback = ref<(...args: unknown[]) => void>()
  defaultMocks.$uppyService.subscribe.mockImplementation((event, callback) => {
    onUploadCompleteCallback.value = callback
    return null
  })
  defaultMocks.$clientService.webdav.listFiles.mockResolvedValue(
    mock<ListFilesResult>({ children: uploadedFiles })
  )

  const mocks = {
    ...defaultMocks,
    pasteActionHandler,
    onUploadCompleteCallback
  }

  return {
    mocks,
    wrapper: shallowMount(CreateAndUpload, {
      props: { space: space, itemId },
      global: {
        stubs: { OcButton: false },
        renderStubDefaultSlot: true,
        mocks,
        provide: mocks,
        plugins
      }
    })
  }
}
