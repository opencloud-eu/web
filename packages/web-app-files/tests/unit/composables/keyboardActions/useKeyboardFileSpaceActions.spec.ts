import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Key, KeyboardActions } from '@opencloud-eu/web-pkg'
import { useKeyboardFileSpaceActions } from '../../../../src/composables/keyboardActions/useKeyboardFileSpaceActions'

const copyResources = vi.fn()
const cutResources = vi.fn()
const pasteHandler = vi.fn()

let selectedResources: Resource[] = []
let currentFolder: Resource | null = null
let clipboardResources: Resource[] = []

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useClipboardStore: () => ({
    copyResources,
    cutResources,
    get resources() {
      return clipboardResources
    }
  }),
  useResourcesStore: () => ({
    get selectedResources() {
      return selectedResources
    },
    get currentFolder() {
      return currentFolder
    }
  })
}))

vi.mock('../../../../src/composables/actions', () => ({
  useFileActionsPaste: () => ({ actions: ref([{ handler: pasteHandler }]) })
}))

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

function install() {
  const keyActions = createKeyActions()
  useKeyboardFileSpaceActions(keyActions, ref(mock<SpaceResource>()))
  return keyActions
}

beforeEach(() => {
  vi.clearAllMocks()
  selectedResources = []
  currentFolder = null
  clipboardResources = []
})

describe('useKeyboardFileSpaceActions vault gating', () => {
  it('copies a non-vault selection on Ctrl+C', () => {
    selectedResources = [mock<Resource>({ isInVault: false })]
    trigger(install(), Key.C)
    expect(copyResources).toHaveBeenCalledTimes(1)
  })

  it('does not copy a vault selection on Ctrl+C', () => {
    selectedResources = [mock<Resource>({ isInVault: true })]
    trigger(install(), Key.C)
    expect(copyResources).not.toHaveBeenCalled()
  })

  it('does not cut a vault selection on Ctrl+X', () => {
    selectedResources = [mock<Resource>({ isInVault: true })]
    trigger(install(), Key.X)
    expect(cutResources).not.toHaveBeenCalled()
  })

  it('pastes into a normal folder on Ctrl+V', () => {
    clipboardResources = [mock<Resource>()]
    currentFolder = mock<Resource>({ isInVault: false })
    trigger(install(), Key.V)
    expect(pasteHandler).toHaveBeenCalledTimes(1)
  })

  it('does not paste into a vault folder on Ctrl+V', () => {
    clipboardResources = [mock<Resource>()]
    currentFolder = mock<Resource>({ isInVault: true })
    trigger(install(), Key.V)
    expect(pasteHandler).not.toHaveBeenCalled()
  })
})
