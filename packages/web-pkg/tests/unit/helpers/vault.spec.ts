import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import { mock } from 'vitest-mock-extended'
import {
  decryptResourceInPlace,
  encryptResourcePathsForServer,
  getVaultCreator,
  isVaultSpaceResource,
  markSpaceVaultStatus,
  markVaultStatus
} from '../../../src/helpers/vault'
import {
  ExtensionRegistry,
  VaultEngine
} from '../../../src/composables/piniaStores/extensionRegistry'

function mockExtensionRegistry(
  claimsPath: (space: SpaceResource, path: string) => unknown
): ExtensionRegistry {
  return {
    extensions: [{ type: 'vault', claimsPath, resolve: (): unknown => null }]
  } as unknown as ExtensionRegistry
}

describe('markVaultStatus', () => {
  const space = { id: 'space-1' } as SpaceResource

  it('flags a vault root as in-vault but keeps its Shareable permission', () => {
    const registry = mockExtensionRegistry((_space, path) =>
      path.startsWith('/my.vault') ? { vaultRoot: '/my.vault', unlockRoute: {} } : null
    )
    const root = { path: '/my.vault', isFolder: true, permissions: 'RDNVWZP' } as Resource

    markVaultStatus(registry, space, [root])

    expect(root.isInVault).toBe(true)
    // A vault root stays collaborator-shareable (Shareable kept); only public
    // links are blocked, and that is gated on `isInVault` in the link UI, not
    // by stripping the permission here.
    expect(root.permissions).toContain(DavPermission.Shareable)
    expect(root.permissions).toBe('RDNVWZP')
  })

  it('strips Shareable from vault content (anything below the root)', () => {
    const registry = mockExtensionRegistry((_space, path) =>
      path.startsWith('/my.vault') ? { vaultRoot: '/my.vault', encryptsNames: true } : null
    )
    const content = { path: '/my.vault/secret.txt', permissions: 'RDNVWZP' } as Resource

    markVaultStatus(registry, space, [content])

    expect(content.isInVault).toBe(true)
    // content can't be claimed once a share rebases the path -> never shareable
    expect(content.permissions).not.toContain(DavPermission.Shareable)
    expect(content.permissions).toBe('DNVWZP')
  })

  it('leaves resources outside any vault untouched', () => {
    const registry = mockExtensionRegistry(() => null)
    const resource = { path: '/regular-folder', permissions: 'RDNVWZP' } as Resource

    markVaultStatus(registry, space, [resource])

    expect(resource.isInVault).toBeFalsy()
    expect(resource.permissions).toBe('RDNVWZP')
  })

  it('handles a root vault "/" (directly-shared vault): keeps the root, strips content', () => {
    // A directly-shared vault claims vaultRoot "/"; the whole share space is the
    // vault. The root "/" keeps Shareable, content below it is stripped.
    const registry = mockExtensionRegistry(() => ({ vaultRoot: '/', encryptsNames: true }))
    const root = { path: '/', isFolder: true, permissions: 'RDNVWZP' } as Resource
    const content = { path: '/sub/file.txt', permissions: 'RDNVWZP' } as Resource

    markVaultStatus(registry, space, [root, content])

    expect(root.isInVault).toBe(true)
    expect(root.permissions).toBe('RDNVWZP')
    expect(content.isInVault).toBe(true)
    expect(content.permissions).toBe('DNVWZP')
  })

  it('ignores resources without a path', () => {
    const registry = mockExtensionRegistry(() => ({ unlockRoute: {} }))
    const resource = { permissions: 'RDNVWZP' } as Resource

    markVaultStatus(registry, space, [resource])

    expect(resource.isInVault).toBeFalsy()
    expect(resource.permissions).toBe('RDNVWZP')
  })

  it('does not treat a *file* whose name ends in .vault as a vault root', () => {
    // `.vault`-suffix detection would otherwise mis-flag a plain file.
    const registry = mockExtensionRegistry((_space, path) =>
      path === '/report.vault' ? { vaultRoot: '/report.vault', encryptsNames: true } : null
    )
    const file = {
      path: '/report.vault',
      type: 'file',
      isFolder: false,
      permissions: 'RDNVWZP'
    } as Resource

    markVaultStatus(registry, space, [file])

    expect(file.isInVault).toBeFalsy()
  })

  it('still flags a folder vault root detected by name suffix', () => {
    const registry = mockExtensionRegistry((_space, path) =>
      path === '/docs.vault' ? { vaultRoot: '/docs.vault', encryptsNames: true } : null
    )
    const folder = {
      path: '/docs.vault',
      type: 'folder',
      isFolder: true,
      permissions: 'RDNVWZP'
    } as Resource

    markVaultStatus(registry, space, [folder])

    expect(folder.isInVault).toBe(true)
  })
})

describe('markSpaceVaultStatus', () => {
  it('flags a space that is a vault and keeps it shareable', () => {
    // An encrypted space claims vaultRoot "/", which is the space's own path.
    const registry = mockExtensionRegistry(() => ({ vaultRoot: '/', encryptsNames: true }))
    const space = {
      id: 'space-1',
      path: '/',
      isFolder: true,
      permissions: 'RDNVWZP'
    } as SpaceResource

    markSpaceVaultStatus(registry, [space])

    expect(space.isInVault).toBe(true)
    expect(space.permissions).toContain(DavPermission.Shareable)
  })

  it('leaves a space that no scheme claims untouched', () => {
    const registry = mockExtensionRegistry(() => null)
    const space = { id: 'space-1', path: '/', isFolder: true } as SpaceResource

    markSpaceVaultStatus(registry, [space])

    expect(space.isInVault).toBeFalsy()
  })

  it('ignores empty input', () => {
    const registry = mockExtensionRegistry(() => ({ vaultRoot: '/' }))

    expect(() => markSpaceVaultStatus(registry, [undefined, null])).not.toThrow()
    expect(() => markSpaceVaultStatus(registry, undefined)).not.toThrow()
  })
})

describe('isVaultSpaceResource', () => {
  it('is true only for a project space that is flagged as vault', () => {
    expect(
      isVaultSpaceResource({
        type: 'space',
        driveType: 'project',
        isInVault: true
      } as SpaceResource)
    ).toBe(true)
    expect(isVaultSpaceResource({ type: 'space', driveType: 'project' } as SpaceResource)).toBe(
      false
    )
    expect(isVaultSpaceResource({ type: 'folder', isInVault: true } as Resource)).toBe(false)
    expect(isVaultSpaceResource(undefined)).toBe(false)
  })

  it('is false for a shared vault folder, which is a folder rather than a space', () => {
    expect(
      isVaultSpaceResource({ type: 'space', driveType: 'share', isInVault: true } as SpaceResource)
    ).toBe(false)
  })
})

describe('getVaultCreator', () => {
  function mockRegistry(extensions: unknown[]): ExtensionRegistry {
    return { extensions } as unknown as ExtensionRegistry
  }

  it('returns the first scheme that can create vaults', () => {
    const readOnly = { id: 'read-only', type: 'vault' }
    const creator = {
      id: 'creator',
      type: 'vault',
      creation: {
        vaultExtension: 'vault',
        vaultContentType: 'application/vnd.opencloud.vault',
        setupComponent: {}
      }
    }

    expect(getVaultCreator(mockRegistry([readOnly, creator]))).toBe(creator)
  })

  it('returns null when no registered scheme can create vaults', () => {
    expect(getVaultCreator(mockRegistry([{ id: 'read-only', type: 'vault' }]))).toBeNull()
  })

  it('returns null when no vault scheme is registered at all', () => {
    expect(getVaultCreator(mockRegistry([{ id: 'other', type: 'resourceIndicator' }]))).toBeNull()
  })
})

describe('encryptResourcePathsForServer', () => {
  const space = { id: 'space-1' } as SpaceResource

  function registryResolving(engine: VaultEngine | null): ExtensionRegistry {
    return {
      extensions: [
        {
          type: 'vault',
          claimsPath: (): unknown => null,
          resolve: (_s: SpaceResource, path: string): Promise<VaultEngine | null> =>
            Promise.resolve(path.startsWith('/v.vault') ? engine : null)
        }
      ]
    } as unknown as ExtensionRegistry
  }

  it('encrypts in-vault resource paths and leaves the originals + non-vault paths untouched', async () => {
    const engine = mock<VaultEngine>({ vaultRoot: '/v.vault' })
    // the engine sees the vault-RELATIVE path; encryptVaultPath re-roots it
    engine.encryptPath.mockImplementation((rel: string) => Promise.resolve(`ENC(${rel})`))
    const registry = registryResolving(engine)

    const inVault = { id: '1', path: '/v.vault/secret.txt' } as Resource
    const outside = { id: '2', path: '/normal.txt' } as Resource

    const [a, b] = await encryptResourcePathsForServer(registry, space, [inVault, outside])

    expect(a.path).toBe('/v.vault/ENC(secret.txt)')
    expect(b.path).toBe('/normal.txt')
    // the store-held originals must not be mutated (UI keeps the clear-text path)
    expect(inVault.path).toBe('/v.vault/secret.txt')
  })

  it('returns resources unchanged when the vault is locked (no engine)', async () => {
    const registry = registryResolving(null)
    const inVault = { id: '1', path: '/v.vault/secret.txt' } as Resource

    const [a] = await encryptResourcePathsForServer(registry, space, [inVault])

    expect(a.path).toBe('/v.vault/secret.txt')
  })
})

describe('decryptResourceInPlace', () => {
  it('isolates a decryption failure so one bad blob does not break the listing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const engine = mock<VaultEngine>({ vaultRoot: '/my.vault' })
    engine.decryptPath.mockRejectedValue(new Error('not a valid rclone-crypt name'))
    const resource = {
      path: '/my.vault/CIPHERTEXTBLOB',
      name: 'CIPHERTEXTBLOB',
      permissions: 'RDNVWZP'
    } as Resource

    // must resolve (not reject) so the caller's Promise.all survives
    const result = await decryptResourceInPlace(engine, resource)

    expect(result).toBe(resource)
    // still flagged even though decryption failed (share-gating is applied by
    // the markVaultStatus pass that always follows, not here)
    expect(resource.isInVault).toBe(true)
    // keeps the ciphertext name rather than crashing the load
    expect(resource.name).toBe('CIPHERTEXTBLOB')
  })

  it('rewrites path / name / extension to the cleartext form on success', async () => {
    const engine = mock<VaultEngine>({ vaultRoot: '/my.vault' })
    // the engine returns the vault-RELATIVE clear path; decryptVaultPath re-roots it
    engine.decryptPath.mockResolvedValue('secret.txt')
    const resource = {
      path: '/my.vault/CIPHERTEXTBLOB',
      name: 'CIPHERTEXTBLOB',
      type: 'file',
      mimeType: 'application/octet-stream',
      permissions: 'RDNVWZP'
    } as Resource

    await decryptResourceInPlace(engine, resource)

    expect(resource.path).toBe('/my.vault/secret.txt')
    expect(resource.name).toBe('secret.txt')
    expect(resource.isInVault).toBe(true)
    // mime re-derived from the recovered cleartext extension
    expect(resource.mimeType).toBe('text/plain')
    // share-gating is markVaultStatus' job now, not decryptResourceInPlace's
    expect(resource.permissions).toBe('RDNVWZP')
  })
})
