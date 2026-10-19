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
})

function getUppyService() {
  return new UppyService({ language: mock<Language>({ $gettext: (s: string) => s }) })
}
