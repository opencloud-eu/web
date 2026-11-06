import { mock } from 'vitest-mock-extended'
import { Language } from 'vue3-gettext'
import { OcUppyMeta, UppyService } from '../../../../src/services/uppy/uppyService'

describe('UppyService', () => {
  describe('cancelAllUploads', () => {
    let uppyService: UppyService

    beforeEach(() => {
      uppyService = getUppyService()
    })

    afterEach(() => {
      uppyService.uppy.destroy()
    })

    it('publishes successful and failed files before cancelling clears them', () => {
      const publish = vi.spyOn(uppyService, 'publish')
      const completedId = uppyService.uppy.addFile({
        name: 'completed.txt',
        data: new File(['completed'], 'completed.txt'),
        meta: mock<OcUppyMeta>({ spaceId: 'space-1', driveType: 'project' })
      })
      uppyService.uppy.setFileState(completedId, {
        progress: { ...uppyService.uppy.getFile(completedId).progress, uploadComplete: true }
      })
      const completed = uppyService.uppy.getFile(completedId)
      const failedId = uppyService.uppy.addFile({
        name: 'failed.txt',
        data: new File(['failed'], 'failed.txt')
      })
      uppyService.uppy.setFileState(failedId, { error: 'Upload failed' })
      const failed = uppyService.uppy.getFile(failedId)
      uppyService.uppy.addFile({
        name: 'pending.txt',
        data: new File(['pending'], 'pending.txt')
      })

      uppyService.cancelAllUploads()

      expect(publish).toHaveBeenCalledWith('uploadCancelled', {
        successful: [completed],
        failed: [failed]
      })
      expect(uppyService.uppy.getFiles()).toEqual([])
    })

    it('publishes an empty result when no files have finished', () => {
      const publish = vi.spyOn(uppyService, 'publish')
      uppyService.uppy.addFile({
        name: 'pending.txt',
        data: new File(['pending'], 'pending.txt')
      })

      uppyService.cancelAllUploads()

      expect(publish).toHaveBeenCalledWith('uploadCancelled', { successful: [], failed: [] })
    })
  })

  describe('holdBackFiles', () => {
    let uppyService: UppyService

    beforeEach(() => {
      uppyService = getUppyService()
    })

    afterEach(() => {
      uppyService.uppy.destroy()
    })

    function addFile(name: string, webkitRelativePath = '') {
      const data = new File([name], name, { lastModified: 1 })
      Object.defineProperty(data, 'webkitRelativePath', { value: webkitRelativePath })
      return uppyService.uppy.addFile({ name, data })
    }

    it('takes the files out of the uppy state', () => {
      const heldId = addFile('held.txt')
      const otherId = addFile('other.txt')

      uppyService.holdBackFiles([heldId])

      expect(uppyService.uppy.getFiles().map(({ id }) => id)).toEqual([otherId])
    })

    it('rejects adding held back files again until they are released', () => {
      const heldId = addFile('held.txt')
      uppyService.holdBackFiles([heldId])

      expect(() => addFile('held.txt')).toThrow()
      expect(uppyService.uppy.getFiles()).toEqual([])

      uppyService.releaseHeldBackFiles([heldId])
      addFile('held.txt')
      expect(uppyService.uppy.getFiles().map(({ id }) => id)).toEqual([heldId])
    })

    it.each([
      { case: 'nested file from folder input', name: 'held.txt', path: 'folder/held.txt' },
      { case: 'NFD file name', name: 'héld.txt', path: '' }
    ])('rejects adding a held back $case again', ({ name, path }) => {
      const heldId = addFile(name, path)
      uppyService.holdBackFiles([heldId])

      expect(() => addFile(name, path)).toThrow()
      expect(uppyService.uppy.getFiles()).toEqual([])
    })
  })

  describe('useXhr', () => {
    it.each([true, false])(
      'configures the xhr plugin with withCredentials %s',
      (withCredentials) => {
        const uppyService = getUppyService()

        uppyService.useXhr({ endpoint: '', timeout: 60000, headers: {}, withCredentials })

        expect(uppyService.uppy.getPlugin('XHRUpload').opts).toEqual(
          expect.objectContaining({ withCredentials })
        )
      }
    )

    it('updates withCredentials on an already registered xhr plugin', () => {
      const uppyService = getUppyService()

      uppyService.useXhr({ endpoint: '', timeout: 60000, headers: {}, withCredentials: false })
      uppyService.useXhr({ endpoint: '', timeout: 60000, headers: {}, withCredentials: true })

      expect(uppyService.uppy.getPlugin('XHRUpload').opts).toEqual(
        expect.objectContaining({ withCredentials: true })
      )
    })
  })

  describe('registerUploadInput', () => {
    it('adds the files of every change event, not only of the first one', () => {
      const uppyService = getUppyService()
      const addFiles = vi.spyOn(uppyService, 'addFiles').mockImplementation(() => undefined)
      const input = document.createElement('input')
      uppyService.registerUploadInput(input)

      const first = new File(['first'], 'first.txt')
      Object.defineProperty(input, 'files', { value: [first], configurable: true })
      input.dispatchEvent(new Event('change'))

      const second = new File(['second'], 'second.txt')
      Object.defineProperty(input, 'files', { value: [second], configurable: true })
      input.dispatchEvent(new Event('change'))

      expect(addFiles).toHaveBeenCalledTimes(2)
      expect(addFiles).toHaveBeenNthCalledWith(1, [first])
      expect(addFiles).toHaveBeenNthCalledWith(2, [second])
    })
  })

  describe('removeFailedFiles', () => {
    let uppyService: UppyService
    let uploadedNames: string[]
    let failingNames: string[]

    beforeEach(() => {
      uppyService = getUppyService()
      uploadedNames = []
      failingNames = []
      uppyService.uppy.addUploader((fileIDs) => {
        const files = fileIDs.map((id) => uppyService.uppy.getFile(id))
        uppyService.uppy.emit('upload-start', files)
        for (const file of files) {
          uploadedNames.push(file.name)
          if (failingNames.includes(file.name)) {
            uppyService.uppy.emit('upload-error', file, new Error('Upload failed'))
            continue
          }
          uppyService.uppy.emit('upload-success', file, { status: 200, body: {}, uploadURL: '' })
        }
        return Promise.resolve()
      })
    })

    afterEach(() => {
      uppyService.uppy.destroy()
    })

    function addFile(name: string) {
      uppyService.uppy.addFile({ name, data: new File([name], name) })
    }

    async function uploadFailedFile() {
      failingNames = ['failed.txt']
      addFile('failed.txt')
      await uppyService.uploadFiles()
      failingNames = []
      uploadedNames = []
    }

    it('keeps the failed files of an upload so they can be retried', async () => {
      await uploadFailedFile()

      await uppyService.retryAllUploads()

      expect(uploadedNames).toEqual(['failed.txt'])
    })

    it('makes the next upload send only the new files', async () => {
      await uploadFailedFile()

      uppyService.removeFailedFiles()
      addFile('new.txt')
      await uppyService.uploadFiles()

      expect(uploadedNames).toEqual(['new.txt'])
    })

    it('keeps a failed file that has been added again', async () => {
      await uploadFailedFile()

      addFile('failed.txt')
      uppyService.removeFailedFiles()
      await uppyService.uploadFiles()

      expect(uploadedNames).toEqual(['failed.txt'])
    })
  })
})

function getUppyService() {
  return new UppyService({ language: mock<Language>({ $gettext: (s: string) => s }) })
}
