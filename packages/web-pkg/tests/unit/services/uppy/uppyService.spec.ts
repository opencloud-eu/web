import { mock } from 'vitest-mock-extended'
import { Language } from 'vue3-gettext'
import { UppyService } from '../../../../src/services/uppy/uppyService'

describe('UppyService', () => {
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
