import { mock } from 'vitest-mock-extended'
import { Language } from 'vue3-gettext'
import { OcUppyMeta, UppyService } from '../../../../src/services/uppy/uppyService'

describe('UppyService', () => {
  describe('cancelAllUploads', () => {
    let uppyService: UppyService

    beforeEach(() => {
      uppyService = new UppyService({ language: mock<Language>({ $gettext: (s: string) => s }) })
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
})
