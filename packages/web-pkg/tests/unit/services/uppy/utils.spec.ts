import {
  convertToMinimalUppyFile,
  createFolderDummyFile
} from '../../../../src/services/uppy/utils'

describe('createFolderDummyFile', () => {
  it('creates a dummy file for a directory', () => {
    const dummyFile = createFolderDummyFile('/folder')

    expect(dummyFile.name).toBe('folder')
    expect(dummyFile.type).toBe('directory')
    expect((dummyFile as any).relativePath).toBe('/folder')
  })
})

describe('convertToMinimalUppyFile', () => {
  it('converts a list of files to the minimal Uppy file format', () => {
    const source = 'testSource'
    const file = new File(['content'], 'file1.txt', { type: 'text/plain' })
    ;(file as any).relativePath = '/folder/file1.txt'
    const result = convertToMinimalUppyFile(source, [file])

    expect(result).toEqual([
      {
        source,
        name: 'file1.txt',
        type: 'text/plain',
        data: expect.anything(),
        meta: {
          relativePath: '/folder/file1.txt'
        }
      }
    ])
  })
})
