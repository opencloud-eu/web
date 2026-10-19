import { ref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Key, KeyboardActions, useClipboardStore } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useKeyboardFileActions } from '../../../../src/composables/keyboardActions/useKeyboardFileActions'

const space = {
  id: 'space-1',
  storageId: 'space-1',
  type: 'space',
  driveType: 'project',
  canDownload: () => true
} as unknown as SpaceResource

const file = {
  id: 'file-1',
  storageId: 'space-1',
  type: 'file',
  path: '/file.txt',
  isInVault: false,
  canDownload: () => true
} as unknown as Resource

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

function getWrapper({ selectedResources }: { selectedResources: Resource[] }) {
  const keyActions = createKeyActions()
  const mocks = defaultComponentMocks()
  let clipboardStore: ReturnType<typeof useClipboardStore>
  getComposableWrapper(
    () => {
      clipboardStore = useClipboardStore()
      useKeyboardFileActions(keyActions)
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          spacesState: { spaces: [space] },
          resourcesStore: {
            resources: selectedResources,
            selectedIds: selectedResources.map(({ id }) => id),
            currentFolder: null
          }
        }
      }
    }
  )
  return { keyActions, clipboardStore }
}

describe('useKeyboardFileActions', () => {
  it('copies a selected file on Ctrl+C', () => {
    const { keyActions, clipboardStore } = getWrapper({ selectedResources: [file] })
    trigger(keyActions, Key.C)
    expect(clipboardStore.copyResources).toHaveBeenCalledWith([file])
  })

  it('does not copy a selected space on Ctrl+C', () => {
    const { keyActions, clipboardStore } = getWrapper({ selectedResources: [space] })
    trigger(keyActions, Key.C)
    expect(clipboardStore.copyResources).not.toHaveBeenCalled()
  })

  it('does not copy a vault selection on Ctrl+C', () => {
    const { keyActions, clipboardStore } = getWrapper({
      selectedResources: [{ ...file, isInVault: true } as Resource]
    })
    trigger(keyActions, Key.C)
    expect(clipboardStore.copyResources).not.toHaveBeenCalled()
  })
})
