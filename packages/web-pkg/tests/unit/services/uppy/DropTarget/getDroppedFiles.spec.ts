import { getDroppedFiles } from '../../../../../src/services/uppy/DropTarget/getDroppedFiles'

describe('getDroppedFiles', () => {
  it('retrieves a single file from a given DataTransfer', async () => {
    const expectedFileObj = new File(['Hello World'], 'foo.txt', { type: 'text/plain' })
    const file = {
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

  it('returns empty folders', async () => {
    const folder = {
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

  describe('error handling', () => {
    it('calls a callback when the conversion from entry to file fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('entry to file conversion failed')
      const file = {
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

    it('falls back to dataTransfer.files when getAsEntry fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('getAsEntry failed')
      const file = {
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
