import { getDroppedFiles } from '../../../../../src/services/uppy/DropTarget/getDroppedFiles'

describe('getDroppedFiles', () => {
  it('retrieves a single file from a given DataTransfer', async () => {
    const expectedFileObj = new File(['Hello World'], 'foo.txt', { type: 'text/plain' })
    const file = {
      kind: 'file',
      getAsEntry: () => ({
        isFile: true,
        isDirectory: false,
        file: (resolve: (file: File) => void) => resolve(expectedFileObj)
      })
    } as any

    const dataTransfer = { items: [file] } as any
    const files = await getDroppedFiles(dataTransfer)

    expect(files).toContain(expectedFileObj)
  })

  it('retrieves a file from inside a nested folder from a given DataTransfer', async () => {
    const expectedFileObj = new File(['Hello World'], 'foo.txt', { type: 'text/plain' })
    const file = {
      isFile: true,
      isDirectory: false,
      file: (resolve: (file: File) => void) => resolve(expectedFileObj)
    } as any

    let folderInsideFinished = false
    const folderInside = {
      isFile: false,
      isDirectory: true,
      fullPath: '/rootFolder/folderInside',
      createReader: () => ({
        readEntries: (callback: (entries: any[]) => void) => {
          callback(!folderInsideFinished ? [file] : [])
          folderInsideFinished = true
        }
      })
    }

    let rootFolderFinished = false
    const rootFolder = {
      kind: 'file',
      getAsEntry: () =>
        ({
          isFile: false,
          isDirectory: true,
          fullPath: '/rootFolder',
          createReader: () => ({
            readEntries: (callback: (entries: any[]) => void) => {
              callback(!rootFolderFinished ? [folderInside] : [])
              rootFolderFinished = true
            }
          })
        }) as any
    }

    const dataTransfer = { items: [rootFolder] } as any
    const files = await getDroppedFiles(dataTransfer)

    expect(files).toContain(expectedFileObj)
  })

  it('ignores items without a file system entry, like string data', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const stringItem = { kind: 'string', getAsEntry: (): null => null }

    const dataTransfer = { items: [stringItem], files: [] as File[] } as any
    const files = await getDroppedFiles(dataTransfer)

    expect(files).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('returns empty folders', async () => {
    const folder = {
      kind: 'file',
      getAsEntry: () =>
        ({
          isFile: false,
          isDirectory: true,
          fullPath: '/folder',
          createReader: () => ({
            readEntries: (callback: (entries: any[]) => void) => {
              callback([])
            }
          })
        }) as any
    }

    const dataTransfer = { items: [folder] } as any
    const files = await getDroppedFiles(dataTransfer)

    expect((files[0] as any).relativePath).toEqual('/folder')
  })

  it('reads the files of a folder concurrently and keeps their order', async () => {
    const fileObjs = ['a.txt', 'b.txt', 'c.txt'].map((name) => new File([''], name))
    const pending: (() => void)[] = []
    const entries = fileObjs.map((fileObj) => ({
      isFile: true,
      isDirectory: false,
      name: fileObj.name,
      fullPath: `/folder/${fileObj.name}`,
      file: (resolve: (file: File) => void) => pending.push(() => resolve(fileObj))
    }))

    let folderRead = false
    const folder = {
      kind: 'file',
      getAsEntry: () =>
        ({
          isFile: false,
          isDirectory: true,
          fullPath: '/folder',
          createReader: () => ({
            readEntries: (callback: (entries: any[]) => void) => {
              callback(!folderRead ? entries : [])
              folderRead = true
            }
          })
        }) as any
    }

    const result = getDroppedFiles({ items: [folder] } as any)
    await vi.waitFor(() => expect(pending.length).toBe(fileObjs.length))
    pending.reverse().forEach((resolve) => resolve())

    const files = await result
    expect(files).toEqual(fileObjs)
    expect(files.map((f) => (f as any).relativePath)).toEqual([
      '/folder/a.txt',
      '/folder/b.txt',
      '/folder/c.txt'
    ])
  })

  describe('error handling', () => {
    it('calls a callback when the conversion from entry to file fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('entry to file conversion failed')
      const file = {
        kind: 'file',
        getAsEntry: () => ({
          isFile: true,
          isDirectory: false,
          file: (resolve: (file: File) => void, reject: (error: Error) => void) => reject(error)
        })
      } as any

      const dataTransfer = { items: [file] } as any
      const onError = vi.fn()
      await getDroppedFiles(dataTransfer, onError)

      expect(onError).toHaveBeenCalledWith(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
    })

    it('falls back to dataTransfer.files for a file without an entry', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const fileObj = new File(['Hello World'], 'foo.txt', { type: 'text/plain' })
      const fileItem = { kind: 'file', getAsEntry: (): null => null }

      const dataTransfer = { items: [fileItem], files: [fileObj] } as any
      const files = await getDroppedFiles(dataTransfer)

      expect(files).toEqual([fileObj])
      consoleErrorSpy.mockRestore()
    })

    it('falls back to dataTransfer.files when getAsEntry fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('getAsEntry failed')
      const file = {
        kind: 'file',
        getAsEntry: () => {
          throw error
        }
      } as any

      const dataTransfer = { items: [file], files: [file] } as any
      const files = await getDroppedFiles(dataTransfer)

      expect(files).toEqual([file])
      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
    })
  })
})
