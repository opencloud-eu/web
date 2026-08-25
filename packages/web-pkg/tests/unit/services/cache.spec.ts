import { cacheService } from '../../../src/services'
import { Cache } from '../../../src/helpers/cache'

describe('cache', () => {
  describe('cacheService', () => {
    test('filePreview', () => {
      const filePreviewCache = cacheService.filePreview
      expect(filePreviewCache).toBeInstanceOf(Cache)
    })

    describe('filePreview object URLs', () => {
      const revokeObjectURL = vi.fn()

      beforeEach(() => {
        cacheService.filePreview.clear()
        revokeObjectURL.mockClear()
        window.URL.revokeObjectURL = revokeObjectURL
      })

      it('revokes the object URL when an entry is deleted', () => {
        cacheService.filePreview.set('1', { src: 'blob:preview-1' }, 0)
        cacheService.filePreview.delete('1')

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
      })

      it('revokes the object URL when an entry is replaced', () => {
        cacheService.filePreview.set('1', { src: 'blob:preview-1' }, 0)
        cacheService.filePreview.set('1', { src: 'blob:preview-2' }, 0)

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
        expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:preview-2')
      })

      it('does not revoke when the replacement carries the same object URL', () => {
        cacheService.filePreview.set('1', { src: 'blob:preview-1', etag: 'a' }, 0)
        cacheService.filePreview.set('1', { src: 'blob:preview-1', etag: 'b' }, 0)

        expect(revokeObjectURL).not.toHaveBeenCalled()
      })

      it('revokes the object URLs when the cache is cleared', () => {
        cacheService.filePreview.set('1', { src: 'blob:preview-1' }, 0)
        cacheService.filePreview.set('2', { src: 'blob:preview-2' }, 0)
        cacheService.filePreview.clear()

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-2')
      })

      it('does not revoke plain URLs', () => {
        cacheService.filePreview.set('1', { src: 'https://example.org/preview.png' }, 0)
        cacheService.filePreview.delete('1')

        expect(revokeObjectURL).not.toHaveBeenCalled()
      })
    })
  })
})
