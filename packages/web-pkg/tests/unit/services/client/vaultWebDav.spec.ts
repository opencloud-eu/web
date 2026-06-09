import { SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { createVaultWebDav } from '../../../../src/services/client/vaultWebDav'
import {
  decryptResourceInPlace,
  getVaultClaim,
  markVaultStatus,
  resolveFolderVault
} from '../../../../src/helpers/folderVault'

vi.mock('../../../../src/composables/piniaStores/extensionRegistry', () => ({
  useExtensionRegistry: vi.fn(() => ({}))
}))
vi.mock('../../../../src/helpers/folderVault', () => ({
  getVaultClaim: vi.fn(),
  resolveFolderVault: vi.fn(),
  decryptResourceInPlace: vi.fn((_engine, r) => Promise.resolve(r)),
  markVaultStatus: vi.fn()
}))

const space = { id: 'space-1' } as SpaceResource

// A claim exists for any path that sits inside a "*.vault" segment; the root is
// the path up to and including that segment (mirrors the real findVaultRoot).
function vaultRootOf(path: string): string | null {
  const segments = path.split('/').filter(Boolean)
  const idx = segments.findIndex((s) => s.endsWith('.vault'))
  return idx === -1 ? null : '/' + segments.slice(0, idx + 1).join('/')
}

function fakeEngine(vaultRoot: string) {
  return {
    vaultRoot,
    encryptPath: vi.fn((p: string) => Promise.resolve(`ENC(${p})`))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getVaultClaim).mockImplementation((_r, _s, path) => {
    const root = vaultRootOf(path ?? '')
    return root ? ({ vaultRoot: root, encryptsNames: true } as any) : null
  })
  vi.mocked(decryptResourceInPlace).mockImplementation((_engine, r) => Promise.resolve(r))
})

function makeInner(overrides: Partial<WebDAV> = {}): WebDAV {
  return {
    listFiles: vi.fn().mockResolvedValue({ resource: undefined, children: [] }),
    getFileInfo: vi.fn().mockResolvedValue(undefined),
    createFolder: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    moveFiles: vi.fn().mockResolvedValue(undefined),
    copyFiles: vi.fn().mockResolvedValue(undefined),
    restoreFileVersion: vi.fn().mockResolvedValue(undefined),
    getFileContents: vi.fn(),
    search: vi.fn(),
    registerExtraProp: vi.fn(),
    ...overrides
  } as unknown as WebDAV
}

describe('createVaultWebDav', () => {
  describe('non-vault paths (pass-through)', () => {
    it('does not encrypt the path or resolve an engine for listFiles', async () => {
      vi.mocked(resolveFolderVault).mockResolvedValue(null)
      const inner = makeInner({
        listFiles: vi
          .fn()
          .mockResolvedValue({ resource: { path: '/regular' }, children: [{ path: '/regular/a' }] })
      } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await dav.listFiles(space, { path: '/regular' })

      expect(inner.listFiles).toHaveBeenCalledWith(space, { path: '/regular' }, undefined)
      expect(resolveFolderVault).not.toHaveBeenCalled()
      expect(decryptResourceInPlace).not.toHaveBeenCalled()
    })

    it('leaves non-wrapped methods as the inner implementation', () => {
      const inner = makeInner()
      const dav = createVaultWebDav(inner)
      // search / registerExtraProp are not wrapped
      expect(dav.search).toBe(inner.search)
      expect(dav.registerExtraProp).toBe(inner.registerExtraProp)
    })
  })

  describe('vault paths (unlocked)', () => {
    it('encrypts the listFiles path and decrypts the returned resources', async () => {
      const engine = fakeEngine('/my.vault')
      vi.mocked(resolveFolderVault).mockResolvedValue(engine as any)
      const inner = makeInner({
        listFiles: vi.fn().mockResolvedValue({
          resource: { path: '/my.vault' },
          children: [{ path: '/my.vault/enc1' }, { path: '/my.vault/enc2' }]
        })
      } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await dav.listFiles(space, { path: '/my.vault' })

      // the vault root maps to an empty relative path, so it stays clear text
      expect(inner.listFiles).toHaveBeenCalledWith(space, { path: '/my.vault' }, undefined)
      // resource + both children decrypted on the way back
      expect(decryptResourceInPlace).toHaveBeenCalledTimes(3)
      expect(markVaultStatus).toHaveBeenCalledTimes(1)
    })

    it('encrypts the getFileInfo path and decrypts the single result', async () => {
      const engine = fakeEngine('/my.vault')
      vi.mocked(resolveFolderVault).mockResolvedValue(engine as any)
      const inner = makeInner({
        getFileInfo: vi.fn().mockResolvedValue({ path: '/my.vault/enc1' })
      } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await dav.getFileInfo(space, { path: '/my.vault/hello.txt' })

      expect(inner.getFileInfo).toHaveBeenCalledWith(
        space,
        { path: '/my.vault/ENC(hello.txt)' },
        undefined
      )
      expect(decryptResourceInPlace).toHaveBeenCalledTimes(1)
    })

    it('encrypts the createFolder path and decrypts the result', async () => {
      const engine = fakeEngine('/my.vault')
      vi.mocked(resolveFolderVault).mockResolvedValue(engine as any)
      const inner = makeInner({
        createFolder: vi.fn().mockResolvedValue({ path: '/my.vault/enc1' })
      } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await dav.createFolder(space, { path: '/my.vault/new folder' })

      expect(inner.createFolder).toHaveBeenCalledWith(space, { path: '/my.vault/ENC(new folder)' })
      expect(decryptResourceInPlace).toHaveBeenCalledTimes(1)
    })

    it('encrypts both source and target paths for moveFiles', async () => {
      const engine = fakeEngine('/my.vault')
      vi.mocked(resolveFolderVault).mockResolvedValue(engine as any)
      const inner = makeInner()
      const dav = createVaultWebDav(inner)

      await dav.moveFiles(space, { path: '/my.vault/a' }, space, { path: '/my.vault/b' })

      expect(inner.moveFiles).toHaveBeenCalledWith(
        space,
        { path: '/my.vault/ENC(a)' },
        space,
        { path: '/my.vault/ENC(b)' },
        undefined
      )
    })

    it('encrypts the deleteFile path', async () => {
      const engine = fakeEngine('/my.vault')
      vi.mocked(resolveFolderVault).mockResolvedValue(engine as any)
      const inner = makeInner()
      const dav = createVaultWebDav(inner)

      await dav.deleteFile(space, { path: '/my.vault/gone.txt' })

      expect(inner.deleteFile).toHaveBeenCalledWith(space, { path: '/my.vault/ENC(gone.txt)' })
    })

    it('encrypts the restoreFileVersion target path', async () => {
      const engine = fakeEngine('/my.vault')
      vi.mocked(resolveFolderVault).mockResolvedValue(engine as any)
      const inner = makeInner()
      const dav = createVaultWebDav(inner)

      await dav.restoreFileVersion(space, { path: '/my.vault/f.txt', parentFolderId: 'p' }, 'v1')

      expect(inner.restoreFileVersion).toHaveBeenCalledWith(
        space,
        { path: '/my.vault/ENC(f.txt)', parentFolderId: 'p' },
        'v1',
        undefined
      )
    })

    it('resolves each vault engine once for a listing spanning multiple vaults', async () => {
      vi.mocked(resolveFolderVault).mockImplementation((_r, _s, path) =>
        Promise.resolve(fakeEngine(path as string) as any)
      )
      const inner = makeInner({
        listFiles: vi.fn().mockResolvedValue({
          resource: { path: '/trash' },
          children: [
            { path: '/a.vault/x' },
            { path: '/a.vault/y' },
            { path: '/b.vault/z' },
            { path: '/plain/file' }
          ]
        })
      } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await dav.listFiles(space, {})

      // two distinct vault roots -> two resolves, each by its clear-text root
      expect(resolveFolderVault).toHaveBeenCalledTimes(2)
      expect(resolveFolderVault).toHaveBeenCalledWith(expect.anything(), space, '/a.vault')
      expect(resolveFolderVault).toHaveBeenCalledWith(expect.anything(), space, '/b.vault')
      // the three in-vault resources get decrypted, the plain one does not
      expect(decryptResourceInPlace).toHaveBeenCalledTimes(3)
    })
  })

  describe('vault paths (locked)', () => {
    it('leaves the path unencrypted and only flags vault status when no engine resolves', async () => {
      vi.mocked(resolveFolderVault).mockResolvedValue(null)
      const inner = makeInner({
        listFiles: vi.fn().mockResolvedValue({
          resource: { path: '/my.vault' },
          children: [{ path: '/my.vault/enc1' }]
        })
      } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await dav.listFiles(space, { path: '/my.vault' })

      // locked: can't encrypt, path goes out untouched
      expect(inner.listFiles).toHaveBeenCalledWith(space, { path: '/my.vault' }, undefined)
      // locked: nothing to decrypt with, but vault status is still flagged
      expect(decryptResourceInPlace).not.toHaveBeenCalled()
      expect(markVaultStatus).toHaveBeenCalledTimes(1)
    })

    it('still lets the vault root itself be created without an engine', async () => {
      // Creating the vault folder is how a vault comes into existence - its
      // clear-text root name needs no key, so this must NOT fail closed.
      vi.mocked(resolveFolderVault).mockResolvedValue(null)
      const inner = makeInner({
        createFolder: vi.fn().mockResolvedValue({ path: '/my.vault' })
      } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await dav.createFolder(space, { path: '/my.vault' })

      expect(inner.createFolder).toHaveBeenCalledWith(space, { path: '/my.vault' })
    })

    it('refuses to create a folder in a locked vault (fail closed)', async () => {
      vi.mocked(resolveFolderVault).mockResolvedValue(null)
      const inner = makeInner()
      const dav = createVaultWebDav(inner)

      await expect(dav.createFolder(space, { path: '/my.vault/new' })).rejects.toThrow(
        /locked vault/
      )
      expect(inner.createFolder).not.toHaveBeenCalled()
    })

    it('refuses to move a path into/out of a locked vault (fail closed)', async () => {
      vi.mocked(resolveFolderVault).mockResolvedValue(null)
      const inner = makeInner()
      const dav = createVaultWebDav(inner)

      await expect(
        dav.moveFiles(space, { path: '/my.vault/a' }, space, { path: '/my.vault/b' })
      ).rejects.toThrow(/locked vault/)
      expect(inner.moveFiles).not.toHaveBeenCalled()
    })

    it('refuses to delete a path in a locked vault (fail closed)', async () => {
      vi.mocked(resolveFolderVault).mockResolvedValue(null)
      const inner = makeInner()
      const dav = createVaultWebDav(inner)

      await expect(dav.deleteFile(space, { path: '/my.vault/gone.txt' })).rejects.toThrow(
        /locked vault/
      )
      expect(inner.deleteFile).not.toHaveBeenCalled()
    })

    it('refuses to write content into a locked vault (fail closed)', async () => {
      vi.mocked(resolveFolderVault).mockResolvedValue(null)
      const inner = makeInner({ putFileContents: vi.fn() } as Partial<WebDAV>)
      const dav = createVaultWebDav(inner)

      await expect(
        dav.putFileContents(space, { path: '/my.vault/f.txt', content: 'secret' })
      ).rejects.toThrow(/locked vault/)
      expect(inner.putFileContents).not.toHaveBeenCalled()
    })
  })
})
