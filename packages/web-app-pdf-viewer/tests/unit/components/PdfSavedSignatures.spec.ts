import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfSavedSignatures from '../../../src/components/PdfSavedSignatures.vue'
import type { SavedSignature } from '../../../src/composables/usePdfSignatureStorage'

vi.mock('pdfjs-dist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pdfjs-dist')>()),
  SignatureExtractor: {
    processDrawnLines: vi.fn(() => ({
      outline: { viewBox: '0 0 10 5', toSVGPath: () => 'M0 0L10 5' }
    }))
  }
}))

const signature: SavedSignature = {
  uuid: 'uuid-1',
  description: 'Jane Doe',
  areContours: false,
  lines: { curves: [{ points: [1, 2] }], thickness: 2, width: 100, height: 50 }
}

function createWrapper(signatures = [signature]) {
  return mount(PdfSavedSignatures, {
    props: { signatures },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } },
    attachTo: document.body
  })
}

describe('PdfSavedSignatures', () => {
  it('shows a preview of each saved signature', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.pdf-viewer-saved-signature path').attributes('d')).toBe('M0 0L10 5')
    expect(wrapper.find('.pdf-viewer-saved-signature').text()).toContain('Jane Doe')
    expect(wrapper.find('.pdf-viewer-remove-signature').attributes('aria-label')).toBe(
      'Remove saved signature: Jane Doe'
    )
  })

  it('adds, removes and asks for a new signature', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.pdf-viewer-saved-signature button').trigger('click')
    await wrapper.find('.pdf-viewer-remove-signature').trigger('click')
    await wrapper.find('.pdf-viewer-add-signature').trigger('click')
    expect(wrapper.emitted('add')).toEqual([[signature]])
    expect(wrapper.emitted('remove')).toEqual([['uuid-1']])
    expect(wrapper.emitted('addNew')).toHaveLength(1)
  })

  describe('removing', () => {
    const other: SavedSignature = { ...signature, uuid: 'uuid-2', description: 'J. D.' }

    afterEach(() => {
      document.body.innerHTML = ''
    })

    it.each([
      [0, 'J. D.'],
      [1, 'Jane Doe']
    ])(
      'moves the focus to the next entry, else the one before (removed: %s)',
      async (index, next) => {
        const wrapper = createWrapper([signature, other])
        await wrapper.findAll('.pdf-viewer-remove-signature')[index].trigger('click')
        await wrapper.setProps({ signatures: [[other], [signature]][index] })
        expect(document.activeElement.getAttribute('aria-label')).toBe(
          `Remove saved signature: ${next}`
        )
      }
    )

    it('moves the focus to "Add new" once none is left', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.pdf-viewer-remove-signature').trigger('click')
      await wrapper.setProps({ signatures: [] })
      expect(document.activeElement.classList).toContain('pdf-viewer-add-signature')
    })
  })
})
