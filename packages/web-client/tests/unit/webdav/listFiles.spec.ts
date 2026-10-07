import { mock } from 'vitest-mock-extended'
import { ListFilesFactory } from '../../../src/webdav/listFiles'
import { DAV } from '../../../src/webdav/client'
import { GetPathForFileIdFactory } from '../../../src/webdav/getPathForFileId'
import { SpaceResource } from '../../../src/helpers'
import { WebDavOptions } from '../../../src/webdav/types'

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
})
