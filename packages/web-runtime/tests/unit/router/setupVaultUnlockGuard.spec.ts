import { Router } from 'vue-router'
import { setupVaultUnlockGuard } from '../../../src/router/setupVaultUnlockGuard'
import { getVaultClaim, resolveFolderVault, useSpacesStore } from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', () => ({
  getVaultClaim: vi.fn(),
  resolveFolderVault: vi.fn(),
  useExtensionRegistry: vi.fn(() => ({})),
  useSpacesStore: vi.fn()
}))

const space = { id: 'space-1', driveAlias: 'personal/admin' }
const unlockRoute = {
  name: 'rclone-crypt-unlock',
  query: { spaceId: 'space-1', vaultRoot: '/my.vault' }
}

type Guard = (to: any) => Promise<unknown>

const loadMountPoints = vi.fn()
const createShareSpace = vi.fn()

function installGuard({
  spaces = [] as any[],
  claim = null as any,
  engine = null as any,
  spacesInitialized = true,
  mountPointsInitialized = true
} = {}): Guard {
  vi.mocked(useSpacesStore).mockReturnValue({
    spaces,
    spacesInitialized,
    mountPointsInitialized,
    loadMountPoints,
    createShareSpace
  } as any)
  vi.mocked(getVaultClaim).mockReturnValue(claim)
  vi.mocked(resolveFolderVault).mockResolvedValue(engine)

  const clientService = { graphAuthenticated: {} } as any

  let guard: Guard
  const router = { beforeEach: (fn: Guard) => (guard = fn) } as unknown as Router
  setupVaultUnlockGuard(router, clientService)
  return guard
}

describe('setupVaultUnlockGuard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows navigation without a drive target', async () => {
    const guard = installGuard()
    expect(await guard({ params: {} })).toBe(true)
  })

  it('lets the unlock route itself through', async () => {
    const guard = installGuard({ spaces: [space] })
    expect(
      await guard({
        params: { driveAliasAndItem: 'personal/admin/my.vault' },
        name: 'rclone-crypt-unlock'
      })
    ).toBe(true)
  })

  it('allows a non-vault path', async () => {
    const guard = installGuard({ spaces: [space], claim: null })
    expect(
      await guard({ params: { driveAliasAndItem: 'personal/admin/folder' }, fullPath: '/x' })
    ).toBe(true)
  })

  it('allows an already-unlocked vault path (engine resolves)', async () => {
    const guard = installGuard({
      spaces: [space],
      claim: { vaultRoot: '/my.vault', unlockRoute },
      engine: {}
    })
    expect(
      await guard({ params: { driveAliasAndItem: 'personal/admin/my.vault' }, fullPath: '/x' })
    ).toBe(true)
  })

  it('redirects a locked vault path to the unlock route, carrying the intended URL', async () => {
    const guard = installGuard({
      spaces: [space],
      claim: { vaultRoot: '/my.vault', unlockRoute },
      engine: null
    })

    const result = await guard({
      params: { driveAliasAndItem: 'personal/admin/my.vault' },
      fullPath: '/files/personal/admin/my.vault'
    })

    expect(result).toEqual({
      name: 'rclone-crypt-unlock',
      query: {
        spaceId: 'space-1',
        vaultRoot: '/my.vault',
        redirectUrl: '/files/personal/admin/my.vault'
      }
    })
  })

  it('does not match a sibling drive alias (prefix guard)', async () => {
    // driveAlias is `personal/admin`; `personal/admin-other/...` must NOT match,
    // otherwise we'd compute a wrong path and possibly mis-gate it.
    const guard = installGuard({ spaces: [space], claim: null })

    const result = await guard({
      params: { driveAliasAndItem: 'personal/admin-other/x' },
      fullPath: '/x'
    })

    expect(result).toBe(true)
    expect(getVaultClaim).not.toHaveBeenCalled()
  })

  it('redirects a directly-shared vault root (path computed as "/") to unlock', async () => {
    // The vault IS the share root: driveAliasAndItem === the share-space
    // driveAlias, so the computed path is "/", and the claim roots the vault at
    // "/". This is the share-receiver flow that previously got no unlock prompt.
    const shareSpace = { id: 's1', driveAlias: 'share/myvault.vault' }
    const guard = installGuard({
      spaces: [shareSpace],
      claim: {
        vaultRoot: '/',
        unlockRoute: { name: 'rclone-crypt-unlock', query: { spaceId: 's1', vaultRoot: '/' } }
      },
      engine: null
    })

    const result = await guard({
      params: { driveAliasAndItem: 'share/myvault.vault' },
      fullPath: '/files/spaces/share/myvault.vault'
    })

    expect(getVaultClaim).toHaveBeenCalledWith(expect.anything(), shareSpace, '/')
    expect(result).toEqual({
      name: 'rclone-crypt-unlock',
      query: { spaceId: 's1', vaultRoot: '/', redirectUrl: '/files/spaces/share/myvault.vault' }
    })
  })

  it('lazy-loads mount-points and builds the share space, then redirects a locked vault', async () => {
    // On a hard reload into a share space, the share space isn't in the store
    // yet (mount-point spaces are fetched on demand). Given the `shareId` query,
    // the guard loads the mount points, finds the matching one, builds a share
    // space from it, and only then gates the vault - otherwise a locked vault
    // would slip through unguarded.
    const mountPoint = {
      id: 'mp1',
      name: 'myvault.vault',
      root: { remoteItem: { id: 'share-123' } }
    }
    const builtShareSpace = { id: 'share-123', driveAlias: 'share/myvault.vault' }
    const spaces: any[] = []
    loadMountPoints.mockImplementation(() => {
      // simulate the store getting populated once the load resolves
      spaces.push(mountPoint)
    })
    createShareSpace.mockReturnValue(builtShareSpace)

    const guard = installGuard({
      spaces,
      mountPointsInitialized: false,
      claim: {
        vaultRoot: '/',
        unlockRoute: {
          name: 'rclone-crypt-unlock',
          query: { spaceId: 'share-123', vaultRoot: '/' }
        }
      },
      engine: null
    })

    const result = await guard({
      params: { driveAliasAndItem: 'share/myvault.vault' },
      query: { shareId: 'share-123' },
      fullPath: '/files/spaces/share/myvault.vault'
    })

    expect(loadMountPoints).toHaveBeenCalledWith({ graphClient: expect.anything() })
    expect(createShareSpace).toHaveBeenCalledWith({
      driveAliasPrefix: 'share',
      id: 'share-123',
      shareName: 'myvault.vault'
    })
    expect(result).toEqual({
      name: 'rclone-crypt-unlock',
      query: {
        spaceId: 'share-123',
        vaultRoot: '/',
        redirectUrl: '/files/spaces/share/myvault.vault'
      }
    })
  })

  it('does not build a share space when no mount point matches the share id', async () => {
    const guard = installGuard({
      spaces: [{ id: 'other', root: { remoteItem: { id: 'different' } } }],
      mountPointsInitialized: true
    })

    const result = await guard({
      params: { driveAliasAndItem: 'share/myvault.vault' },
      query: { shareId: 'share-123' },
      fullPath: '/x'
    })

    expect(result).toBe(true)
    expect(createShareSpace).not.toHaveBeenCalled()
    expect(getVaultClaim).not.toHaveBeenCalled()
  })

  it('skips the mount-point lazy load when the share space is already in the store', async () => {
    const shareSpace = { id: 's1', driveAlias: 'share/myvault.vault' }
    const guard = installGuard({
      spaces: [shareSpace],
      mountPointsInitialized: false,
      claim: null
    })

    await guard({
      params: { driveAliasAndItem: 'share/myvault.vault' },
      query: { shareId: 'share-123' },
      fullPath: '/x'
    })

    expect(loadMountPoints).not.toHaveBeenCalled()
    expect(createShareSpace).not.toHaveBeenCalled()
  })
})
