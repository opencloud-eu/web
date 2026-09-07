import { SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { Graph } from '@opencloud-eu/web-client/graph'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { createGraphWebDav } from '../../../../src/services/client/graphWebDav'

const space = {
  id: 'storage$space',
  webDavPath: '/dav/spaces/storage$space',
  driveType: 'personal'
} as unknown as SpaceResource

const file = {
  id: 'storage$space!item',
  name: 'lorem.txt',
  file: { mimeType: 'text/plain' },
  parentReference: { path: '/Documents' }
} as DriveItem

function getDav(driveItem: DriveItem = file) {
  const statDriveItem = vi.fn().mockResolvedValue(driveItem)
  const inner = { getFileInfo: vi.fn() } as unknown as WebDAV
  const dav = createGraphWebDav(
    inner,
    () => ({ driveItems: { statDriveItem } }) as unknown as Graph
  )
  return { dav, statDriveItem, inner }
}

describe('createGraphWebDav', () => {
  it('stats by id', async () => {
    const { dav, statDriveItem, inner } = getDav()

    const resource = await dav.getFileInfo(space, { fileId: 'storage$space!item' })

    expect(statDriveItem.mock.calls[0][0]).toBe('storage$space')
    expect(statDriveItem.mock.calls[0][1]).toEqual({ itemId: 'storage$space!item' })
    expect(inner.getFileInfo).not.toHaveBeenCalled()
    expect(resource.name).toBe('lorem.txt')
    expect(resource.mimeType).toBe('text/plain')
  })

  it('stats by path and keeps the requested one', async () => {
    const { dav, statDriveItem } = getDav()

    const resource = await dav.getFileInfo(space, { path: '/Documents/lorem.txt' })

    expect(statDriveItem.mock.calls[0][1]).toEqual({ path: '/Documents/lorem.txt' })
    expect(resource.path).toBe('/Documents/lorem.txt')
  })

  it('derives the path from the item when only an id was given', async () => {
    const { dav } = getDav()

    const resource = await dav.getFileInfo(space, { fileId: 'storage$space!item' })

    expect(resource.path).toBe('/Documents/lorem.txt')
  })

  it('addresses a public link by the drive built from its token', async () => {
    const { dav, statDriveItem } = getDav()
    const publicSpace = { ...space, id: 'sometoken', driveType: 'public' } as unknown as SpaceResource

    await dav.getFileInfo(publicSpace, { path: '/' })

    expect(statDriveItem.mock.calls[0][0]).toBe(
      '7993447f-687f-490d-875c-ac95e89a62a4$7993447f-687f-490d-875c-ac95e89a62a4!sometoken'
    )
  })

  it('asks for the previews and the download url', async () => {
    const { dav, statDriveItem } = getDav()

    await dav.getFileInfo(space, { fileId: 'storage$space!item' })

    const options = statDriveItem.mock.calls[0][2]
    expect(options.expand).toEqual(new Set(['thumbnails']))
    expect(options.select).toContain('@microsoft.graph.downloadUrl')
  })
})
