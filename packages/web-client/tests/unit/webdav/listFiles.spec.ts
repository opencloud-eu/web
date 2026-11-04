import { mock } from 'vitest-mock-extended'
import { ListFilesFactory } from '../../../src/webdav/listFiles'
import { DAV } from '../../../src/webdav/client'
import { GetPathForFileIdFactory } from '../../../src/webdav/getPathForFileId'
import { SpaceResource } from '../../../src/helpers'
import { WebDavOptions } from '../../../src/webdav/types'
import { DavProperty } from '../../../src/webdav/constants'

describe('listFiles', () => {
  it('throws a 404 instead of listing the space root when the file id resolves to an empty path', async () => {
    const dav = mock<DAV>({ extraProps: [] })
    dav.propfind.mockRejectedValue({ statusCode: 404 })
    const pathForFileIdFactory = mock<ReturnType<typeof GetPathForFileIdFactory>>()
    pathForFileIdFactory.getPathForFileId.mockResolvedValue('')
    const filesFactory = ListFilesFactory(dav, pathForFileIdFactory, mock<WebDavOptions>())

    const space = mock<SpaceResource>({ id: 'space-id', webDavPath: '/spaces/space-id' })
    await expect(
      filesFactory.listFiles(space, { path: '/deleted.txt', fileId: 'deleted-id' })
    ).rejects.toThrow(expect.objectContaining({ statusCode: 404 }))
    expect(dav.propfind).toHaveBeenCalledTimes(1)
  })

  it('builds the public link root with an absolute WebDAV url', async () => {
    const dav = mock<DAV>({ extraProps: [] })
    dav.propfind.mockResolvedValue([
      { basename: 'token', filename: '/token', type: 'directory', props: {} }
    ] as Awaited<ReturnType<DAV['propfind']>>)
    const filesFactory = ListFilesFactory(
      dav,
      mock<ReturnType<typeof GetPathForFileIdFactory>>(),
      mock<WebDavOptions>({ baseUrl: 'https://server.example' })
    )

    const space = mock<SpaceResource>({
      id: 'token',
      driveType: 'public',
      driveAlias: 'public/token',
      webDavPath: '/public-files/token'
    })
    const { resource } = await filesFactory.listFiles(space)
    expect((resource as SpaceResource).getWebDavUrl({ path: '/file.txt' })).toBe(
      'https://server.example/dav/public-files/token/file.txt'
    )
  })

  it('builds a single trash item when listing the trash bin with a path', async () => {
    const dav = mock<DAV>({ extraProps: [] })
    dav.propfind.mockResolvedValue([
      {
        basename: 'node1',
        filename: '/spaces/trash-bin/space-id/node1',
        type: 'file',
        props: {
          [DavProperty.TrashbinOriginalFilename]: 'file.txt',
          [DavProperty.TrashbinOriginalLocation]: 'folder/file.txt'
        }
      }
    ] as Awaited<ReturnType<DAV['propfind']>>)
    const filesFactory = ListFilesFactory(
      dav,
      mock<ReturnType<typeof GetPathForFileIdFactory>>(),
      mock<WebDavOptions>()
    )

    const space = mock<SpaceResource>({ id: 'space-id' })
    const { resource, children } = await filesFactory.listFiles(
      space,
      { path: 'node1' },
      { depth: 0, isTrash: true }
    )

    expect(dav.propfind).toHaveBeenCalledWith('/spaces/trash-bin/space-id/node1', expect.anything())
    expect(resource).toEqual(
      expect.objectContaining({ id: 'node1', name: 'file.txt', path: '/folder/file.txt' })
    )
    expect(children).toEqual([])
  })
})
