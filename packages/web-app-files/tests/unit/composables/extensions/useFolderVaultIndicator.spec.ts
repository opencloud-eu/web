import { useFolderVaultIndicator } from '../../../../src/composables/extensions/useFolderVaultIndicator'

let unlocked = false
let claim: any = null
let matchedSpace: any = { id: 'space-1' }

vi.mock('@opencloud-eu/web-pkg', () => ({
  getVaultClaim: vi.fn(() => claim),
  useExtensionRegistry: () => ({}),
  useFolderVaultStore: () => ({ isUnlocked: () => unlocked }),
  useGetMatchingSpace: () => ({ getMatchingSpace: () => matchedSpace })
}))

vi.mock('vue3-gettext', () => ({ useGettext: () => ({ $gettext: (s: string) => s }) }))

const vaultRoot = '/my.vault'
const resource = (overrides: Record<string, unknown> = {}) =>
  ({ id: 'r1', path: vaultRoot, storageId: 'space-1', isInVault: true, ...overrides }) as any

beforeEach(() => {
  vi.clearAllMocks()
  unlocked = false
  claim = { vaultRoot }
  matchedSpace = { id: 'space-1' }
})

describe('folder-vault resource indicator', () => {
  const getIndicators = (res: any) => useFolderVaultIndicator().getResourceIndicators(res)

  it('returns nothing for a resource outside any vault', () => {
    expect(getIndicators(resource({ isInVault: false }))).toBeUndefined()
  })

  it('returns nothing when no extension claims the path', () => {
    claim = null
    expect(getIndicators(resource())).toBeUndefined()
  })

  it('shows a closed padlock for a locked vault root', () => {
    unlocked = false
    const indicators = getIndicators(resource()) as any[]
    expect(indicators).toHaveLength(1)
    expect(indicators[0].icon).toBe('lock-2')
    expect(indicators[0].fillType).toBe('fill')
    expect(indicators[0].type).toBe('vault-locked')
  })

  it('shows an open padlock for an unlocked vault root', () => {
    unlocked = true
    const indicators = getIndicators(resource()) as any[]
    expect(indicators).toHaveLength(1)
    expect(indicators[0].icon).toBe('lock-unlock')
    expect(indicators[0].type).toBe('vault-unlocked')
  })

  it('annotates content inside an unlocked vault', () => {
    unlocked = true
    const indicators = getIndicators(resource({ path: '/my.vault/sub/file.txt' })) as any[]
    expect(indicators).toHaveLength(1)
    expect(indicators[0].type).toBe('vault-unlocked')
  })

  it('does not annotate content while the vault is locked', () => {
    unlocked = false
    expect(getIndicators(resource({ path: '/my.vault/sub/file.txt' }))).toBeUndefined()
  })
})
