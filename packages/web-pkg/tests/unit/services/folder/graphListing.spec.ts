import { SpaceResource } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { listFilesViaGraph } from '../../../../src/services/folder/loaders/graphListing'
import {
  decryptResourceInPlace,
  getVaultClaim,
  markVaultStatus,
  resolveVaultEngine
} from '../../../../src/helpers/vault'

vi.mock('../../../../src/composables/piniaStores/extensionRegistry', () => ({
  useExtensionRegistry: vi.fn(() => ({}))
}))
// only the vault primitives are mocked, the translation on top of them runs
vi.mock('../../../../src/helpers/vault', () => ({
  getVaultClaim: vi.fn(() => null),
  resolveVaultEngine: vi.fn(),
  decryptResourceInPlace: vi.fn((_engine, r) => Promise.resolve(r)),
  markVaultStatus: vi.fn()
}))

const space = {
  id: 'storage$space',
  webDavPath: '/dav/spaces/storage$space',
  root: { id: 'storage$space!root' }
} as unknown as SpaceResource

const folder = {
  id: 'storage$space!folder',
  name: 'Fotos',
  folder: {},
  parentReference: { id: 'storage$space!root', path: '/' },
  children: [
    { id: 'storage$space!child', name: 'bild.jpg', file: { mimeType: 'image/jpeg' }, size: 12 }
  ]
} as DriveItem

function getGraphClient(driveItem: DriveItem = folder) {
  const statDriveItem = vi.fn().mockResolvedValue(driveItem)
  return {
    graphClient: { driveItems: { statDriveItem } } as unknown as Graph,
    statDriveItem
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getVaultClaim).mockReturnValue(null)
  vi.mocked(decryptResourceInPlace).mockImplementation((_engine, r) => Promise.resolve(r))
})

describe('listFilesViaGraph', () => {
  it('addresses the drive root by id, it has no path lookup', async () => {
    const { graphClient, statDriveItem } = getGraphClient()

    await listFilesViaGraph({ graphClient, space, path: '/', fileId: null, signal: null })

    expect(statDriveItem).toHaveBeenCalledWith(
      'storage$space',
      { itemId: 'storage$space!root' },
      expect.objectContaining({ expand: new Set(['children', 'thumbnails']) }),
      { signal: null }
    )
  })

  it('prefers the file id over the path', async () => {
    const { graphClient, statDriveItem } = getGraphClient()

    await listFilesViaGraph({
      graphClient,
      space,
      path: '/Fotos',
      fileId: 'storage$space!folder',
      signal: null
    })

    expect(statDriveItem.mock.calls[0][1]).toEqual({ itemId: 'storage$space!folder' })
  })

  it('looks a folder up by path when there is no file id', async () => {
    const { graphClient, statDriveItem } = getGraphClient()

    await listFilesViaGraph({ graphClient, space, path: '/Fotos', fileId: null, signal: null })

    expect(statDriveItem.mock.calls[0][1]).toEqual({ path: '/Fotos' })
  })

  it('builds the folder and its children in one go', async () => {
    const { graphClient } = getGraphClient()

    const { resource, children } = await listFilesViaGraph({
      graphClient,
      space,
      path: '/Fotos',
      fileId: null,
      signal: null
    })

    expect(resource.path).toBe('/Fotos')
    expect(resource.isFolder).toBe(true)
    expect(children).toHaveLength(1)
    expect(children[0].path).toBe('/Fotos/bild.jpg')
    expect(children[0].mimeType).toBe('image/jpeg')
  })

  describe('inside a vault', () => {
    beforeEach(() => {
      vi.mocked(getVaultClaim).mockImplementation((_registry, _space, path) =>
        path?.startsWith('/my.vault') ? ({ vaultRoot: '/my.vault' } as any) : null
      )
      vi.mocked(resolveVaultEngine).mockResolvedValue({
        vaultRoot: '/my.vault',
        encryptPath: vi.fn((p: string) => Promise.resolve(`ENC(${p})`))
      } as any)
    })

    it('encrypts the looked up path, the server knows the encrypted names only', async () => {
      const { graphClient, statDriveItem } = getGraphClient()

      await listFilesViaGraph({
        graphClient,
        space,
        path: '/my.vault/Urlaub',
        fileId: null,
        signal: null
      })

      expect(statDriveItem.mock.calls[0][1]).toEqual({ path: '/my.vault/ENC(Urlaub)' })
    })

    it('decrypts the folder and its children on the way back', async () => {
      const { graphClient } = getGraphClient({
        id: 'storage$space!enc',
        name: 'enc-folder',
        folder: {},
        parentReference: { path: '/my.vault' },
        children: [{ id: 'storage$space!encChild', name: 'enc-child' }]
      } as DriveItem)

      await listFilesViaGraph({
        graphClient,
        space,
        path: '/my.vault/Urlaub',
        fileId: null,
        signal: null
      })

      expect(decryptResourceInPlace).toHaveBeenCalledTimes(2)
      expect(markVaultStatus).toHaveBeenCalledTimes(1)
    })
  })
})
