import { SpaceResource } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { listFilesViaGraph } from '../../../../src/services/client/graphListing'
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

  it('keeps the paths relative to the share root in a share space', async () => {
    // graph answers in drive coordinates: the share root reports itself as
    // "/folderToShare", while the space is rooted at exactly that item
    const { graphClient } = getGraphClient({
      id: 'storage$space!shared',
      name: 'folderToShare',
      folder: {},
      parentReference: { path: '/' },
      children: [{ id: 'storage$space!child', name: 'lorem.txt' }]
    } as DriveItem)
    const shareSpace = { ...space, driveType: 'share' } as unknown as SpaceResource

    const { resource, children } = await listFilesViaGraph({
      graphClient,
      space: shareSpace,
      path: '/',
      fileId: 'storage$space!shared',
      signal: null
    })

    expect(resource.path).toBe('/')
    expect(children[0].path).toBe('/lorem.txt')
  })
})
