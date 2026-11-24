import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import EmbedActions from '../../../../src/components/EmbedActions/EmbedActions.vue'
import {
  FileAction,
  FolderViewModeConstants,
  useEmbedMode,
  useKeyboardActions,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { useFileActionsCreateLink } from '../../../../src/composables/actions/files'
import { useKeyboardFileNavigation } from '../../../../src/composables/keyboardActions/useKeyboardFileNavigation'
import { mock } from 'vitest-mock-extended'
import { defineComponent, h, nextTick, ref } from 'vue'
import { buildSpace, GraphSharePermission, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Drive } from '@opencloud-eu/web-client/graph/generated'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import { enableAutoUnmount } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useEmbedMode: vi.fn()
}))

vi.mock('../../../../src/composables/actions/files', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActionsCreateLink: vi.fn()
}))

// mounted components keep their document keydown listeners otherwise
enableAutoUnmount(afterEach)

const selectors = Object.freeze({
  btnSelect: '[data-testid="button-select"]',
  btnCancel: '[data-testid="button-cancel"]',
  btnShare: '[data-testid="button-share"]',
  fileNameInput: 'oc-text-input-stub'
})

describe('EmbedActions', () => {
  describe('select action', () => {
    it('should hide select action when embedTarget is set to file', () => {
      const { wrapper } = getWrapper({ isFilePicker: true })

      expect(wrapper.find(selectors.btnSelect).exists()).toBe(false)
    })
    it('should disable select action when no resources are selected', () => {
      const { wrapper } = getWrapper()

      expect(wrapper.find(selectors.btnSelect).attributes()).toHaveProperty('disabled')
    })

    it('should enable select action when at least one resource is selected', () => {
      const { wrapper } = getWrapper({ selectedIds: ['1'] })

      expect(wrapper.find(selectors.btnSelect).attributes()).not.toHaveProperty('disabled')
    })

    it('should emit select event when the select action is triggered', async () => {
      const { wrapper, mocks } = getWrapper({ selectedIds: ['1'] })

      await wrapper.find(selectors.btnSelect).trigger('click')

      expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:select', [{ id: '1' }])
    })

    it('should enable select action when embedTarget is set to location', () => {
      const { wrapper } = getWrapper({
        isLocationPicker: true,
        currentFolder: { canCreate: () => true } as Resource
      })

      expect(wrapper.find(selectors.btnSelect).attributes()).not.toHaveProperty('disabled')
    })

    it('should disable select action when the current folder is in a vault', () => {
      const { wrapper } = getWrapper({
        isLocationPicker: true,
        currentFolder: { canCreate: () => true, isInVault: true } as Resource
      })

      expect(wrapper.find(selectors.btnSelect).attributes()).toHaveProperty('disabled')
    })

    it('should disable select action in a vault when only chooseFileName is configured', () => {
      const { wrapper } = getWrapper({
        isLocationPicker: true,
        chooseFileName: true,
        currentFolder: { path: '/', canCreate: () => true, isInVault: true } as Resource
      })

      expect(wrapper.find(selectors.btnSelect).attributes()).toHaveProperty('disabled')
    })

    it('should enable select action in a vault when allowVault is configured', () => {
      const { wrapper } = getWrapper({
        isLocationPicker: true,
        allowVault: true,
        currentFolder: { canCreate: () => true, isInVault: true } as Resource
      })

      expect(wrapper.find(selectors.btnSelect).attributes()).not.toHaveProperty('disabled')
    })

    it.each([
      { graphPermissions: [GraphSharePermission.createUpload], disabled: false },
      { graphPermissions: [GraphSharePermission.readBasic], disabled: true }
    ])(
      'should set the select action disabled to $disabled at a space root with the permissions $graphPermissions',
      ({ graphPermissions, disabled }) => {
        const space = buildSpace({ id: '1', driveType: 'project' } as Drive)
        const { wrapper } = getWrapper({
          isLocationPicker: true,
          currentFolder: { ...space, graphPermissions } as SpaceResource
        })

        expect(wrapper.find(selectors.btnSelect).attributes('disabled') !== undefined).toBe(
          disabled
        )
      }
    )

    it('should emit select event with currentFolder as selected resource when select action is triggered', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder: { id: '1', canCreate: () => true } as Resource,
        isLocationPicker: true
      })

      await wrapper.find(selectors.btnSelect).trigger('click')

      expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:select', [{ id: '1' }])
    })
    it('should display the file name input when chooseFileName is configured', () => {
      const { wrapper } = getWrapper({
        currentFolder: { id: '1', path: '/', canCreate: () => true } as Resource,
        isLocationPicker: true,
        chooseFileName: true
      })

      expect(wrapper.find(selectors.fileNameInput).exists()).toBe(true)
    })
    it('should hide the file name input when chooseFileName is not configured', () => {
      const { wrapper } = getWrapper({
        currentFolder: { id: '1', path: '/', canCreate: () => true } as Resource,
        isLocationPicker: true
      })

      expect(wrapper.find(selectors.fileNameInput).exists()).toBe(false)
    })
    it('should emit select event with currentFolder as selected resource and fileName when select action is triggered and chooseFileName is configured', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder: { id: '1', path: '/', canCreate: () => true } as Resource,
        isLocationPicker: true,
        chooseFileName: true
      })

      await wrapper.find(selectors.btnSelect).trigger('click')

      expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:select', {
        fileName: 'file.txt',
        resources: [{ id: '1', path: '/' }],
        locationQuery: {
          contextRouteName: 'files-spaces-generic',
          contextRouteQuery: {}
        }
      })
      expect(mocks.postMessageMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('file name input', () => {
    const currentFolder = { id: '1', path: '/', canCreate: () => true } as Resource

    it('shows the file extension and selects the name without it when file extensions are shown', () => {
      const { wrapper } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)

      expect(input.props('modelValue')).toBe('file.txt')
      expect(input.props('selectionRange')).toEqual([0, 4])
    })

    it('hides the file extension in the input and preselects the whole name when file extensions are turned off', () => {
      const { wrapper } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true,
        areFileExtensionsShown: false
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)

      expect(input.props('modelValue')).toBe('file')
      expect(input.props('preselect')).toBe(true)
      expect(input.props('selectionRange')).toBeNull()
    })

    it('adds the hidden file extension back when selecting', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true,
        areFileExtensionsShown: false
      })

      await wrapper.find(selectors.btnSelect).trigger('click')

      expect(mocks.postMessageMock).toHaveBeenCalledWith(
        'opencloud-embed:select',
        expect.objectContaining({ fileName: 'file.txt' })
      )
    })

    it('selects on Enter in the file name input', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })

      await wrapper.find(selectors.fileNameInput).trigger('keydown', { key: 'Enter' })

      expect(mocks.postMessageMock).toHaveBeenCalledWith(
        'opencloud-embed:select',
        expect.objectContaining({ fileName: 'file.txt' })
      )
    })

    it('does not select on Enter for an invalid name', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)
      await input.vm.$emit('update:modelValue', '')

      await wrapper.find(selectors.fileNameInput).trigger('keydown', { key: 'Enter' })

      expect(mocks.postMessageMock).not.toHaveBeenCalled()
    })

    it('does not select on Enter during composition', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })

      await wrapper
        .find(selectors.fileNameInput)
        .trigger('keydown', { key: 'Enter', isComposing: true })

      expect(mocks.postMessageMock).not.toHaveBeenCalled()
    })

    it('does not select on a repeated Enter of a held key', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })

      await wrapper.find(selectors.fileNameInput).trigger('keydown', { key: 'Enter', repeat: true })

      expect(mocks.postMessageMock).not.toHaveBeenCalled()
    })

    it('does not select on Enter outside of the location picker', async () => {
      const { wrapper, mocks } = getWrapper({ currentFolder, chooseFileName: true })

      await wrapper.find(selectors.fileNameInput).trigger('keydown', { key: 'Enter' })

      expect(mocks.postMessageMock).not.toHaveBeenCalled()
    })

    it('disables the select action for an empty name when file extensions are turned off', async () => {
      const { wrapper } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true,
        areFileExtensionsShown: false
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)

      await input.vm.$emit('update:modelValue', '')

      expect(wrapper.find(selectors.btnSelect).attributes('disabled')).toBeDefined()
    })

    it.each([
      { name: '', error: 'The name cannot be empty' },
      { name: 'foo/bar.txt', error: 'The name cannot contain "/"' },
      { name: ' file.txt', error: 'The name cannot start or end with whitespace' }
    ])('shows an error and disables the select action for "$name"', async ({ name, error }) => {
      const { wrapper } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)

      await input.vm.$emit('update:modelValue', name)

      expect(input.props('errorMessage')).toBe(error)
      expect(wrapper.find(selectors.btnSelect).attributes('disabled')).toBeDefined()
    })

    it('adds the file extension back when file extensions get turned on', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true,
        areFileExtensionsShown: false
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)
      await input.vm.$emit('update:modelValue', 'renamed')

      useResourcesStore().areFileExtensionsShown = true
      await nextTick()

      expect(input.props('modelValue')).toBe('renamed.txt')
      await wrapper.find(selectors.btnSelect).trigger('click')
      expect(mocks.postMessageMock).toHaveBeenCalledWith(
        'opencloud-embed:select',
        expect.objectContaining({ fileName: 'renamed.txt' })
      )
    })

    it('hides the file extension when file extensions get turned off', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)
      await input.vm.$emit('update:modelValue', 'renamed.md')

      useResourcesStore().areFileExtensionsShown = false
      await nextTick()

      expect(input.props('modelValue')).toBe('renamed')
      await wrapper.find(selectors.btnSelect).trigger('click')
      expect(mocks.postMessageMock).toHaveBeenCalledWith(
        'opencloud-embed:select',
        expect.objectContaining({ fileName: 'renamed.md' })
      )
    })

    it('keeps the full name of dot files when file extensions are turned off', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true,
        areFileExtensionsShown: false,
        fileNameSuggestion: '.env'
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)

      expect(input.props('modelValue')).toBe('.env')
      await wrapper.find(selectors.btnSelect).trigger('click')
      expect(mocks.postMessageMock).toHaveBeenCalledWith(
        'opencloud-embed:select',
        expect.objectContaining({ fileName: '.env' })
      )
    })

    it('focuses the input initially', () => {
      const { mocks } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true
      })

      expect(mocks.focusMock).toHaveBeenCalled()
    })

    it('allows a name that already exists in the current folder', () => {
      const { wrapper } = getWrapper({
        currentFolder,
        isLocationPicker: true,
        chooseFileName: true,
        folderResources: [{ id: '2', name: 'file.txt', path: '/file.txt' } as Resource]
      })
      const input = wrapper.findComponent<typeof OcTextInput>(selectors.fileNameInput)

      expect(input.props('modelValue')).toBe('file.txt')
      expect(input.props('errorMessage')).toBeUndefined()
      expect(wrapper.find(selectors.btnSelect).attributes()).not.toHaveProperty('disabled')
    })
  })

  describe('cancel action', () => {
    it('should emit cancel event when the cancel action is triggered', async () => {
      const { wrapper, mocks } = getWrapper({ selectedIds: ['1'] })

      await wrapper.find(selectors.btnCancel).trigger('click')

      expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:cancel', null)
    })

    it.each([
      { isFilePicker: true, isLocationPicker: false },
      { isFilePicker: false, isLocationPicker: true },
      { isFilePicker: false, isLocationPicker: false }
    ])('should emit cancel event on Escape (%o)', (options) => {
      const { mocks } = getWrapper(options)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:cancel', null)
    })

    describe('within the file list', () => {
      function pressEscape() {
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        )
      }

      it('should only clear the selection on the first Escape and emit cancel event on the second', () => {
        const { mocks } = getWrapper({ selectedIds: ['1', '2'], withFileNavigation: true })

        pressEscape()

        expect(useResourcesStore().selectedIds).toEqual([])
        expect(mocks.postMessageMock).not.toHaveBeenCalled()

        pressEscape()

        expect(mocks.postMessageMock).toHaveBeenCalledTimes(1)
        expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:cancel', null)
      })

      it('should emit cancel event on Escape without a selection', () => {
        const { mocks } = getWrapper({ withFileNavigation: true })

        pressEscape()

        expect(mocks.postMessageMock).toHaveBeenCalledTimes(1)
        expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:cancel', null)
      })
    })

    it('should not emit cancel event on Escape that an earlier handler already handled', () => {
      function preventEscape(event: KeyboardEvent) {
        event.preventDefault()
      }
      document.addEventListener('keydown', preventEscape)
      const { mocks } = getWrapper()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

      expect(mocks.postMessageMock).not.toHaveBeenCalled()
      document.removeEventListener('keydown', preventEscape)
    })

    it('should not emit cancel event on Escape while a modal is open', () => {
      const { mocks } = getWrapper()
      const modal = document.createElement('div')
      modal.setAttribute('aria-modal', 'true')
      document.body.append(modal)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(mocks.postMessageMock).not.toHaveBeenCalled()
      modal.remove()
    })

    it('should emit cancel event on Escape in the file name input', async () => {
      const { wrapper, mocks } = getWrapper({
        currentFolder: { id: '1', path: '/', canCreate: () => true } as Resource,
        isLocationPicker: true,
        chooseFileName: true
      })

      await wrapper.find(selectors.fileNameInput).trigger('keydown', { key: 'Escape' })

      expect(mocks.postMessageMock).toHaveBeenCalledTimes(1)
      expect(mocks.postMessageMock).toHaveBeenCalledWith('opencloud-embed:cancel', null)
    })

    it('should not emit cancel event on other keys', () => {
      const { mocks } = getWrapper()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

      expect(mocks.postMessageMock).not.toHaveBeenCalled()
    })
  })

  describe('share action', () => {
    it('should disable share action when no resources are selected', () => {
      const { wrapper } = getWrapper()

      expect(wrapper.find(selectors.btnShare).attributes()).toHaveProperty('disabled')
    })

    it('should disable share action when the "Create Link"-action is disabled', () => {
      const { wrapper } = getWrapper({
        selectedIds: ['1'],
        createLinksActionEnabled: false
      })
      expect(wrapper.find(selectors.btnShare).attributes()).toHaveProperty('disabled')
    })

    it('should enable share action when at least one resource is selected and link creation is enabled', () => {
      const { wrapper } = getWrapper({ selectedIds: ['1'] })
      expect(wrapper.find(selectors.btnShare).attributes()).not.toHaveProperty('disabled')
    })

    it('should hide share action when embedTarget is set to location', () => {
      const { wrapper } = getWrapper({ isLocationPicker: true })

      expect(wrapper.find(selectors.btnShare).exists()).toBe(false)
    })

    it('should hide share action when embedTarget is set to file', () => {
      const { wrapper } = getWrapper({ isFilePicker: true })

      expect(wrapper.find(selectors.btnShare).exists()).toBe(false)
    })

    it('should call the handler of the "Create Link"-action', async () => {
      const { wrapper, mocks } = getWrapper({ selectedIds: ['1'] })
      await wrapper.find(selectors.btnShare).trigger('click')
      expect(mocks.createLinkHandlerMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('button appearance', () => {
    // the actions are rendered on top of the chrome colored area, hence the buttons must not use
    // the chrome color role themselves. Otherwise they'd be invisible on their own background.
    it('should render the cancel action as outlined button', () => {
      const { wrapper } = getWrapper({ isLocationPicker: true })
      const classes = wrapper.find(selectors.btnCancel).classes()

      expect(classes).toContain('oc-button-secondary-outline')
      expect(classes).not.toContain('oc-button-chrome')
    })

    it('should render the select action as filled button', () => {
      const { wrapper } = getWrapper({ isLocationPicker: true })
      const classes = wrapper.find(selectors.btnSelect).classes()

      expect(classes).toContain('oc-button-secondary-filled')
      expect(classes).not.toContain('oc-button-chrome')
    })

    it('should render the share action as filled button', () => {
      const { wrapper } = getWrapper({ selectedIds: ['1'] })
      const classes = wrapper.find(selectors.btnShare).classes()

      expect(classes).toContain('oc-button-secondary-filled')
      expect(classes).not.toContain('oc-button-chrome')
    })
  })
})

function getWrapper(
  {
    selectedIds = [],
    currentFolder = undefined,
    createLinksActionEnabled = true,
    isLocationPicker = false,
    isFilePicker = false,
    chooseFileName = false,
    allowVault = false,
    areFileExtensionsShown = true,
    folderResources = [],
    fileNameSuggestion = 'file.txt',
    withFileNavigation = false
  }: {
    selectedIds?: string[]
    currentFolder?: Resource
    createLinksActionEnabled?: boolean
    isLocationPicker?: boolean
    isFilePicker?: boolean
    chooseFileName?: boolean
    allowVault?: boolean
    areFileExtensionsShown?: boolean
    folderResources?: Resource[]
    fileNameSuggestion?: string
    withFileNavigation?: boolean
  } = {
    selectedIds: []
  }
) {
  const postMessageMock = vi.fn()
  const focusMock = vi.fn()
  vi.mocked(useEmbedMode).mockReturnValue(
    mock<ReturnType<typeof useEmbedMode>>({
      isLocationPicker: ref(isLocationPicker),
      isFilePicker: ref(isFilePicker),
      chooseFileName: ref(chooseFileName),
      chooseFileNameSuggestion: ref(fileNameSuggestion),
      allowVault: ref(allowVault),
      postMessage: postMessageMock
    })
  )

  const createLinkHandlerMock = vi.fn()
  vi.mocked(useFileActionsCreateLink).mockReturnValue(
    mock<ReturnType<typeof useFileActionsCreateLink>>({
      actions: ref([
        mock<FileAction>({
          isVisible: () => createLinksActionEnabled,
          handler: createLinkHandlerMock
        })
      ])
    })
  )

  const resources = [...(selectedIds.map((id) => ({ id })) as Resource[]), ...folderResources]
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'files-spaces-generic',
        path: '/files/spaces/personal/admin'
      })
    }),
    createLinkHandlerMock,
    postMessageMock,
    focusMock
  }

  return {
    mocks,
    wrapper: shallowMount(withFileNavigation ? FileListWithEmbedActions : EmbedActions, {
      global: {
        mocks,
        provide: mocks,
        stubs: {
          EmbedActions: false,
          OcButton: false,
          OcTextInput: getOcTextInputStub(focusMock)
        },
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              stubActions: false,
              resourcesStore: { currentFolder, selectedIds, resources, areFileExtensionsShown }
            }
          })
        ]
      }
    })
  }
}

// like the files views, which bind their keyboard actions before rendering the embed actions
const FileListWithEmbedActions = defineComponent({
  setup() {
    const keyActions = useKeyboardActions()
    useKeyboardFileNavigation(keyActions, ref([]), ref(FolderViewModeConstants.name.table))
    return () => h(EmbedActions)
  }
})

function getOcTextInputStub(focusMock: () => void) {
  return defineComponent({
    name: 'OcTextInput',
    props: OcTextInput.props,
    emits: ['update:modelValue'],
    setup(_, { expose }) {
      expose({ focus: focusMock })
      return () => h('oc-text-input-stub')
    }
  })
}
