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

  describe('stale path with a file id', () => {
    type PropfindResult = Awaited<ReturnType<DAV['propfind']>>
    const resolvedResource = [
      { basename: 'resource', filename: '/resource', type: 'directory', props: {} }
    ] as PropfindResult
    const shareSpace = mock<SpaceResource>({
      id: 'share-id',
      driveType: 'share',
      webDavPath: '/spaces/share-id'
    })

    function setup(paths: Record<string, string>, firstResponse?: PropfindResult) {
      const dav = mock<DAV>({ extraProps: [] })
      if (firstResponse) {
        dav.propfind.mockResolvedValueOnce(firstResponse)
      } else {
        dav.propfind.mockRejectedValueOnce({ statusCode: 404 })
      }
      dav.propfind.mockResolvedValueOnce(resolvedResource)
      const pathForFileIdFactory = mock<ReturnType<typeof GetPathForFileIdFactory>>()
      pathForFileIdFactory.getPathForFileId.mockImplementation((id) =>
        Promise.resolve(paths[id] || '')
      )
      const filesFactory = ListFilesFactory(dav, pathForFileIdFactory, mock<WebDavOptions>())
      return { dav, filesFactory }
    }

    it.each([
      {
        shareRootPath: '/R',
        correctPath: '/R/sub-renamed',
        expected: '/spaces/share-id/sub-renamed'
      },
      {
        shareRootPath: '/R',
        correctPath: '/R/sub-renamed/f.txt',
        expected: '/spaces/share-id/sub-renamed/f.txt'
      },
      { shareRootPath: '/R', correctPath: '/R', expected: '/spaces/share-id' },
      {
        shareRootPath: '/R/sub',
        correctPath: '/R/sub/inner/g.txt',
        expected: '/spaces/share-id/inner/g.txt'
      }
    ])(
      'resolves $correctPath relative to the share root $shareRootPath',
      async ({ shareRootPath, correctPath, expected }) => {
        const { dav, filesFactory } = setup({ 'share-id': shareRootPath, 'item-id': correctPath })

        await filesFactory.listFiles(shareSpace, { path: '/stale', fileId: 'item-id' })

        expect(dav.propfind).toHaveBeenCalledTimes(2)
        expect(dav.propfind).toHaveBeenLastCalledWith(expected, expect.anything())
      }
    )

    it.each(['/S/f.txt', '/Rx/f.txt'])(
      'throws a 404 if the resource at %s is outside of the share',
      async (correctPath) => {
        const { dav, filesFactory } = setup({ 'share-id': '/R', 'item-id': correctPath })

        await expect(
          filesFactory.listFiles(shareSpace, { path: '/f.txt', fileId: 'item-id' })
        ).rejects.toThrow(expect.objectContaining({ statusCode: 404 }))
        expect(dav.propfind).toHaveBeenCalledTimes(1)
      }
    )

    it('resolves the path in a share when the stale path leads to another resource', async () => {
      const { dav, filesFactory } = setup({ 'share-id': '/R', 'item-id': '/R/sub-renamed' }, [
        {
          basename: 'sub',
          filename: '/sub',
          type: 'directory',
          props: { [DavProperty.FileId]: 'other-id' }
        }
      ] as PropfindResult)

      await filesFactory.listFiles(shareSpace, { path: '/sub', fileId: 'item-id' })

      expect(dav.propfind).toHaveBeenCalledTimes(2)
      expect(dav.propfind).toHaveBeenLastCalledWith(
        '/spaces/share-id/sub-renamed',
        expect.anything()
      )
    })

    it('resolves the full path in a personal space', async () => {
      const { dav, filesFactory } = setup({ 'item-id': '/R/sub-renamed' })
      const space = mock<SpaceResource>({
        id: 'space-id',
        driveType: 'personal',
        webDavPath: '/spaces/space-id'
      })

      await filesFactory.listFiles(space, { path: '/R/sub', fileId: 'item-id' })

      expect(dav.propfind).toHaveBeenCalledTimes(2)
      expect(dav.propfind).toHaveBeenLastCalledWith(
        '/spaces/space-id/R/sub-renamed',
        expect.anything()
      )
    })
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
