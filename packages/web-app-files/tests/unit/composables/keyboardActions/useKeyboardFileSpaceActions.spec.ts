import { computed, ref, unref } from 'vue'
import { buildPublicSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ClipboardActions, Key, KeyboardActions, useClipboardStore } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useKeyboardFileSpaceActions } from '../../../../src/composables/keyboardActions/useKeyboardFileSpaceActions'

const pasteHandler = vi.fn()

// keep the real paste checks, only replace the handler that would start the transfer
vi.mock('../../../../src/composables/actions', async (importOriginal) => {
  const original = await importOriginal<any>()
  return {
    ...original,
    useFileActionsPaste: () => {
      const { actions, ...rest } = original.useFileActionsPaste()
      return {
        ...rest,
        actions: computed(() => unref(actions).map((a: any) => ({ ...a, handler: pasteHandler })))
      }
    }
  }
})

function getResource({
  id = '1',
  isInVault = false,
  canBeDeleted = true
}: { id?: string; isInVault?: boolean; canBeDeleted?: boolean } = {}) {
  return {
    id,
    type: 'file',
    path: `/folder/${id}`,
    parentFolderId: 'folder',
    isInVault,
    locked: false,
    canDownload: () => true,
    canBeDeleted: () => canBeDeleted,
    isReceivedShare: () => false,
    isMounted: () => false
  } as unknown as Resource
}

function getSpace({ canUpload = true }: { canUpload?: boolean } = {}) {
  return {
    id: 'space-1',
    type: 'space',
    driveType: 'project',
    canUpload: () => canUpload
  } as unknown as SpaceResource
}

function getPublicSpace() {
  return buildPublicSpaceResource({
    id: 'link-token',
    name: 'link',
    serverUrl: 'https://example.com',
    publicLinkType: 'public'
  })
}

function getCurrentFolder({
  isInVault = false,
  canCreate = true
}: { isInVault?: boolean; canCreate?: boolean } = {}) {
  return {
    id: 'current-folder',
    path: '/current-folder',
    isInVault,
    canCreate: () => canCreate
  } as unknown as Resource
}

function createKeyActions(): KeyboardActions {
  const actions = ref<any[]>([])
  return {
    actions,
    bindKeyAction: vi.fn((keys: any, callback: any) => {
      actions.value.push({ ...keys, modifier: keys.modifier ?? null, callback })
    })
  } as unknown as KeyboardActions
}

function trigger(keyActions: KeyboardActions, primary: Key) {
  const action = (keyActions as any).actions.value.find((a: any) => a.primary === primary)
  action?.callback(new KeyboardEvent('keydown'))
}

function getWrapper({
  space = getSpace(),
  selectedResources = [],
  clipboardResources = [],
  clipboardAction = ClipboardActions.Copy,
  currentFolder = getCurrentFolder()
}: {
  space?: SpaceResource
  selectedResources?: Resource[]
  clipboardResources?: Resource[]
  clipboardAction?: ClipboardActions
  currentFolder?: Resource
} = {}) {
  const keyActions = createKeyActions()
  const mocks = defaultComponentMocks()
  let clipboardStore: ReturnType<typeof useClipboardStore>
  getComposableWrapper(
    () => {
      clipboardStore = useClipboardStore()
      useKeyboardFileSpaceActions(keyActions, ref(space))
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          clipboardState: { action: clipboardAction, resources: clipboardResources },
          resourcesStore: {
            resources: selectedResources,
            selectedIds: selectedResources.map(({ id }) => id),
            currentFolder
          }
        }
      }
    }
  )
  return { keyActions, clipboardStore }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useKeyboardFileSpaceActions', () => {
  describe('Ctrl+C', () => {
    it('copies the selection', () => {
      const resource = getResource()
      const { keyActions, clipboardStore } = getWrapper({ selectedResources: [resource] })
      trigger(keyActions, Key.C)
      expect(clipboardStore.copyResources).toHaveBeenCalledWith([resource])
    })

    it('does not copy a vault selection', () => {
      const { keyActions, clipboardStore } = getWrapper({
        selectedResources: [getResource({ isInVault: true })]
      })
      trigger(keyActions, Key.C)
      expect(clipboardStore.copyResources).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+X', () => {
    it('cuts the selection', () => {
      const resource = getResource()
      const { keyActions, clipboardStore } = getWrapper({ selectedResources: [resource] })
      trigger(keyActions, Key.X)
      expect(clipboardStore.cutResources).toHaveBeenCalledWith([resource])
    })

    it('does not cut a selection without permission to move it', () => {
      const { keyActions, clipboardStore } = getWrapper({
        selectedResources: [getResource({ canBeDeleted: false })]
      })
      trigger(keyActions, Key.X)
      expect(clipboardStore.cutResources).not.toHaveBeenCalled()
    })

    it('does not cut a vault selection', () => {
      const { keyActions, clipboardStore } = getWrapper({
        selectedResources: [getResource({ isInVault: true })]
      })
      trigger(keyActions, Key.X)
      expect(clipboardStore.cutResources).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+V', () => {
    it('pastes into a folder with upload permission', () => {
      const space = getSpace()
      const { keyActions } = getWrapper({ space, clipboardResources: [getResource()] })
      trigger(keyActions, Key.V)
      expect(pasteHandler).toHaveBeenCalledWith({ space })
    })

    it('does not paste with an empty clipboard', () => {
      const { keyActions } = getWrapper()
      trigger(keyActions, Key.V)
      expect(pasteHandler).not.toHaveBeenCalled()
    })

    it('does not paste without upload permission', () => {
      const { keyActions } = getWrapper({
        space: getSpace({ canUpload: false }),
        clipboardResources: [getResource()]
      })
      trigger(keyActions, Key.V)
      expect(pasteHandler).not.toHaveBeenCalled()
    })

    it('pastes into a public link folder that allows creating', () => {
      const space = getPublicSpace()
      const { keyActions } = getWrapper({ space, clipboardResources: [getResource()] })
      trigger(keyActions, Key.V)
      expect(pasteHandler).toHaveBeenCalledWith({ space })
    })

    it('does not paste into a public link folder that does not allow creating', () => {
      const { keyActions } = getWrapper({
        space: getPublicSpace(),
        clipboardResources: [getResource()],
        currentFolder: getCurrentFolder({ canCreate: false })
      })
      trigger(keyActions, Key.V)
      expect(pasteHandler).not.toHaveBeenCalled()
    })

    it('passes cut resources pasted into their own folder on to the handler, which explains why nothing happens', () => {
      const space = getSpace()
      const { keyActions } = getWrapper({
        space,
        clipboardAction: ClipboardActions.Cut,
        clipboardResources: [{ ...getResource(), parentFolderId: 'current-folder' } as Resource]
      })
      trigger(keyActions, Key.V)
      expect(pasteHandler).toHaveBeenCalledWith({ space })
    })

    it('does not paste into a vault folder', () => {
      const { keyActions } = getWrapper({
        clipboardResources: [getResource()],
        currentFolder: getCurrentFolder({ isInVault: true })
      })
      trigger(keyActions, Key.V)
      expect(pasteHandler).not.toHaveBeenCalled()
    })

    it('does not paste a vault clipboard', () => {
      const { keyActions } = getWrapper({ clipboardResources: [getResource({ isInVault: true })] })
      trigger(keyActions, Key.V)
      expect(pasteHandler).not.toHaveBeenCalled()
    })
  })
})
