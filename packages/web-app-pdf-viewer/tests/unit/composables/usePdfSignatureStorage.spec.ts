import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfSignatureStorage } from '../../../src/composables/usePdfSignatureStorage'

const data = { newCurves: [[1, 2, 3, 4]], areContours: false, thickness: 2, width: 100, height: 50 }

function setup() {
  let storage: ReturnType<typeof usePdfSignatureStorage>
  getComposableWrapper(() => {
    storage = usePdfSignatureStorage()
  })
  return storage
}

describe('usePdfSignatureStorage', () => {
  it('saves signatures and lists them for reuse', () => {
    const storage = setup()
    const uuid = storage.save(data, 'Jane Doe')
    expect(storage.signatures.value).toEqual([
      {
        uuid,
        description: 'Jane Doe',
        areContours: false,
        lines: { curves: [{ points: [1, 2, 3, 4] }], thickness: 2, width: 100, height: 50 }
      }
    ])
  })

  it('keeps a snapshot of the lines, later changes of the drawing do not apply', () => {
    const points = [1, 2, 3, 4]
    const storage = setup()
    storage.save({ ...data, newCurves: [points] }, 'Jane Doe')
    points.push(5, 6)
    expect(storage.signatures.value[0].lines.curves[0].points).toEqual([1, 2, 3, 4])
  })

  it('keeps nothing in the browser storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    setup().save(data, 'Jane Doe')
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('starts empty when the viewer is opened again', () => {
    setup().save(data, 'Jane Doe')
    expect(setup().signatures.value).toEqual([])
  })

  it('keeps up to five, like the PDF.js viewer', () => {
    const storage = setup()
    for (let i = 0; i < 5; i++) {
      expect(storage.save(data, `Signature ${i}`)).toBeTruthy()
    }
    expect(storage.isFull.value).toBe(true)
    expect(storage.save(data, 'Too many')).toBeNull()
    expect(storage.signatures.value).toHaveLength(5)
  })

  it('removes signatures', () => {
    const storage = setup()
    const uuid = storage.save(data, 'Jane Doe')
    const other = storage.save(data, 'J. D.')
    storage.remove(uuid)
    expect(storage.signatures.value.map((s) => s.uuid)).toEqual([other])
    expect(storage.isFull.value).toBe(false)
  })
})
