import { unref } from 'vue'
import {
  useFileActionsLockVault,
  useFileActionsUnlockVault
} from '../../../../../src/composables/actions/files/useFileActionsVaultLock'

const showMessage = vi.fn()
const push = vi.fn()
const clearEngine = vi.fn()

// Module-level knobs the mocked web-pkg reads, reset per test.
let unlocked = false
let claim: any = null
let matchedSpace: any = { id: 'space-1', driveAlias: 'personal/admin' }
let routeParams: Record<string, unknown> = {}

vi.mock('@opencloud-eu/web-pkg', () => ({
  createFileRouteOptions: vi.fn(() => ({ name: 'files-spaces-generic' })),
  getVaultClaim: vi.fn(() => claim),
  useExtensionRegistry: () => ({}),
  useFolderVaultStore: () => ({ clearEngine, isUnlocked: () => unlocked }),
  useGetMatchingSpace: () => ({ getMatchingSpace: () => matchedSpace }),
  useMessages: () => ({ showMessage }),
  useRouter: () => ({
    currentRoute: { fullPath: '/back', params: routeParams },
    push
  })
}))

vi.mock('vue3-gettext', () => ({ useGettext: () => ({ $gettext: (s: string) => s }) }))

const vaultRoot = '/my.vault'
const rootResource = () => ({ path: vaultRoot, name: 'my.vault', storageId: 'space-1' }) as any

beforeEach(() => {
  vi.clearAllMocks()
  unlocked = false
  claim = { vaultRoot, unlockRoute: { name: 'unlock', query: { spaceId: 'space-1', vaultRoot } } }
  matchedSpace = { id: 'space-1', driveAlias: 'personal/admin' }
  routeParams = {}
})

describe('lock-vault action', () => {
  it('is visible for an unlocked vault root', () => {
    unlocked = true
    const { actions } = useFileActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [rootResource()] } as any)).toBe(true)
  })

  it('is hidden when the vault root is already locked', () => {
    unlocked = false
    const { actions } = useFileActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [rootResource()] } as any)).toBe(false)
  })

  it('is hidden when the resource is not a vault root', () => {
    unlocked = true
    // claim is for the root, but this resource sits inside it -> not a root
    const inside = { path: '/my.vault/sub', name: 'sub', storageId: 'space-1' } as any
    const { actions } = useFileActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [inside] } as any)).toBe(false)
  })

  it('clears the engine and notifies, no redirect when outside the vault', () => {
    const { actions } = useFileActionsLockVault()
    unref(actions)[0].handler({ resources: [rootResource()] } as any)
    expect(clearEngine).toHaveBeenCalledWith('space-1', vaultRoot)
    expect(showMessage).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('redirects to the parent when the user sits inside the locked vault', () => {
    routeParams = { driveAliasAndItem: 'personal/admin/my.vault' }
    const { actions } = useFileActionsLockVault()
    unref(actions)[0].handler({ resources: [rootResource()] } as any)
    expect(clearEngine).toHaveBeenCalledWith('space-1', vaultRoot)
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('does not redirect when the user sits in a sibling vault (prefix guard)', () => {
    // `/my.vault-notes` merely starts with `/my.vault`; a naive substring match
    // would wrongly bounce the user out. The segment-wise compare must not.
    routeParams = { driveAliasAndItem: 'personal/admin/my.vault-notes' }
    const { actions } = useFileActionsLockVault()
    unref(actions)[0].handler({ resources: [rootResource()] } as any)
    expect(clearEngine).toHaveBeenCalledWith('space-1', vaultRoot)
    expect(push).not.toHaveBeenCalled()
  })

  it('does nothing for a non-root resource', () => {
    const inside = { path: '/my.vault/sub', name: 'sub', storageId: 'space-1' } as any
    const { actions } = useFileActionsLockVault()
    unref(actions)[0].handler({ resources: [inside] } as any)
    expect(clearEngine).not.toHaveBeenCalled()
  })
})

describe('unlock-vault action', () => {
  it('is visible for a locked vault root', () => {
    unlocked = false
    const { actions } = useFileActionsUnlockVault()
    expect(unref(actions)[0].isVisible({ resources: [rootResource()] } as any)).toBe(true)
  })

  it('is hidden once the vault root is unlocked', () => {
    unlocked = true
    const { actions } = useFileActionsUnlockVault()
    expect(unref(actions)[0].isVisible({ resources: [rootResource()] } as any)).toBe(false)
  })

  it('is hidden when the claim carries no unlock route', () => {
    claim = { vaultRoot }
    const { actions } = useFileActionsUnlockVault()
    expect(unref(actions)[0].isVisible({ resources: [rootResource()] } as any)).toBe(false)
  })

  it('pushes the claim unlock route with the current location as redirect', () => {
    const { actions } = useFileActionsUnlockVault()
    unref(actions)[0].handler({ resources: [rootResource()] } as any)
    expect(push).toHaveBeenCalledWith({
      name: 'unlock',
      query: { spaceId: 'space-1', vaultRoot, redirectUrl: '/back' }
    })
  })
})
