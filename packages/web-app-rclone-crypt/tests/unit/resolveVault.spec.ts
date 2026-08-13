import { SpaceResource } from '@opencloud-eu/web-client'
import { claimsVaultPath, resolveVault } from '../../src/resolveVault'
import { VAULT_CONTENT_TYPE } from '../../src/vaultLocation'

const getEngine = vi.fn()
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useVaultStore: () => ({ getEngine })
}))

const shareSpace = (name: string) =>
  ({ id: 's1', driveType: 'share', name }) as unknown as SpaceResource
const personalSpace = { id: 'p1', driveType: 'personal', name: 'Admin' } as unknown as SpaceResource
const projectSpace = (contentType?: string) =>
  ({ id: 'pr1', driveType: 'project', name: 'Team', contentType }) as unknown as SpaceResource

beforeEach(() => vi.clearAllMocks())

describe('claimsVaultPath', () => {
  it('claims a directly-shared vault (share space whose name ends in .vault) rooted at "/"', () => {
    const claim = claimsVaultPath(shareSpace('myvault.vault'), '/')

    expect(claim).toMatchObject({ vaultRoot: '/', encryptsNames: true })
    expect(claim?.unlockRoute).toMatchObject({
      name: 'rclone-crypt-unlock',
      query: { spaceId: 's1', vaultRoot: '/' }
    })
  })

  it('does not claim a normal share whose name does not end in .vault', () => {
    expect(claimsVaultPath(shareSpace('documents'), '/')).toBeNull()
  })

  it('does not claim a non-share space at its root', () => {
    expect(claimsVaultPath(personalSpace, '/')).toBeNull()
  })

  it('claims a project space marked as a vault drive, rooted at "/"', () => {
    const claim = claimsVaultPath(projectSpace(VAULT_CONTENT_TYPE), '/')

    expect(claim).toMatchObject({ vaultRoot: '/', encryptsNames: true })
    expect(claim?.unlockRoute).toMatchObject({
      name: 'rclone-crypt-unlock',
      query: { spaceId: 'pr1', vaultRoot: '/' }
    })
  })

  it('claims content inside a vault space, still rooted at "/"', () => {
    expect(claimsVaultPath(projectSpace(VAULT_CONTENT_TYPE), '/sub/file.txt')?.vaultRoot).toBe('/')
  })

  it('does not claim a project space without the vault marker', () => {
    expect(claimsVaultPath(projectSpace(), '/')).toBeNull()
  })

  it('does not claim a project space handled by another extension', () => {
    expect(claimsVaultPath(projectSpace('application/vnd.opencloud.ocnb'), '/')).toBeNull()
  })

  it('path-based detection still wins for a nested vault, regardless of space', () => {
    // owner / vault-nested-under-shared-folder: the `.vault` segment is in the path
    const claim = claimsVaultPath(personalSpace, '/myvault.vault/sub')
    expect(claim?.vaultRoot).toBe('/myvault.vault')
  })
})

describe('resolveVault', () => {
  it('reads the engine stored under (shareSpaceId, "/") for a directly-shared vault', () => {
    const engine = { vaultRoot: '/' } as any
    getEngine.mockReturnValue(engine)

    expect(resolveVault(shareSpace('myvault.vault'), '/')).toBe(engine)
    expect(getEngine).toHaveBeenCalledWith('s1', '/')
  })

  it('returns null (and never hits the store) when no vault is detected', () => {
    expect(resolveVault(shareSpace('documents'), '/')).toBeNull()
    expect(getEngine).not.toHaveBeenCalled()
  })
})
