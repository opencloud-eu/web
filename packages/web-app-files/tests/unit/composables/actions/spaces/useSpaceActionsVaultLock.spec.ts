import { unref } from 'vue'
import { useSpaceActionsLockVault } from '../../../../../src/composables/actions/spaces/useSpaceActionsVaultLock'

const showMessage = vi.fn()
const push = vi.fn()
const clearEngine = vi.fn()

// Module-level knobs the mocked web-pkg reads, reset per test.
let unlocked = false
let claim: any = null
let routeName = 'files-spaces-projects'

vi.mock('@opencloud-eu/web-pkg', () => ({
  getSpaceVaultClaim: vi.fn((_registry: unknown, space: unknown) => (space ? claim : null)),
  SPACE_VAULT_ROOT: '/',
  useExtensionRegistry: () => ({}),
  useVaultStore: () => ({ clearEngine, isUnlocked: () => unlocked }),
  useMessages: () => ({ showMessage }),
  useRoute: () => ({ name: routeName }),
  useRouter: () => ({ push })
}))

vi.mock('vue3-gettext', () => ({ useGettext: () => ({ $gettext: (s: string) => s }) }))

const vaultSpace = () => ({ id: 'space-1', name: 'Secrets', driveType: 'project' }) as any
const disabledVaultSpace = () => ({ ...vaultSpace(), disabled: true }) as any

beforeEach(() => {
  vi.clearAllMocks()
  unlocked = false
  claim = { vaultRoot: '/' }
  routeName = 'files-spaces-projects'
})

describe('lock-vault space action', () => {
  it('is visible for an unlocked vault space', () => {
    unlocked = true
    const { actions } = useSpaceActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [vaultSpace()] })).toBe(true)
  })

  it('is hidden when the vault space is already locked', () => {
    const { actions } = useSpaceActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [vaultSpace()] })).toBe(false)
  })

  it('is hidden for a space that is no vault', () => {
    unlocked = true
    claim = null
    const { actions } = useSpaceActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [vaultSpace()] })).toBe(false)
  })

  it('is hidden for a multi-selection', () => {
    unlocked = true
    const { actions } = useSpaceActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [vaultSpace(), vaultSpace()] })).toBe(false)
  })

  it('is hidden for a disabled space', () => {
    unlocked = true
    const { actions } = useSpaceActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [disabledVaultSpace()] })).toBe(false)
  })

  it('is hidden for an empty selection', () => {
    unlocked = true
    const { actions } = useSpaceActionsLockVault()
    expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
  })

  it('clears the engine and notifies, without redirecting from the spaces overview', () => {
    const { actions } = useSpaceActionsLockVault()
    unref(actions)[0].handler({ resources: [vaultSpace()] })

    expect(clearEngine).toHaveBeenCalledWith('space-1', '/')
    // the $gettext mock does not interpolate
    expect(showMessage).toHaveBeenCalledWith({ title: '»%{space}« was locked' })
    expect(push).not.toHaveBeenCalled()
  })

  it('leaves the space when the user is inside it', () => {
    routeName = 'files-spaces-generic'
    const { actions } = useSpaceActionsLockVault()
    unref(actions)[0].handler({ resources: [vaultSpace()] })

    expect(push).toHaveBeenCalledWith({ name: 'files-spaces-projects' })
  })

  it('does nothing for a space that is no vault', () => {
    claim = null
    const { actions } = useSpaceActionsLockVault()
    unref(actions)[0].handler({ resources: [vaultSpace()] })

    expect(clearEngine).not.toHaveBeenCalled()
    expect(showMessage).not.toHaveBeenCalled()
  })

  it('does not leave the space when it is no vault', () => {
    claim = null
    routeName = 'files-spaces-generic'
    const { actions } = useSpaceActionsLockVault()
    unref(actions)[0].handler({ resources: [vaultSpace()] })

    expect(push).not.toHaveBeenCalled()
  })

  it('does nothing for an empty selection', () => {
    const { actions } = useSpaceActionsLockVault()
    unref(actions)[0].handler({ resources: [] })

    expect(clearEngine).not.toHaveBeenCalled()
    expect(showMessage).not.toHaveBeenCalled()
  })
})
