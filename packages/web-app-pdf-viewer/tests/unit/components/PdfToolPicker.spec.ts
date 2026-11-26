import { defaultPlugins, mount, ocDropStub } from '@opencloud-eu/web-test-helpers'
import { AnnotationEditorParamsType, AnnotationEditorType } from 'pdfjs-dist'
import PdfToolPicker from '../../../src/components/PdfToolPicker.vue'
import type { SavedSignature } from '../../../src/composables/usePdfSignatureStorage'

vi.mock('pdfjs-dist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pdfjs-dist')>()),
  SignatureExtractor: {
    processDrawnLines: () => ({ outline: { viewBox: '0 0 1 1', toSVGPath: () => '' } })
  }
}))

const hide = ocDropStub.methods.hide as ReturnType<typeof vi.fn>

function createWrapper({
  editorMode = AnnotationEditorType.NONE,
  savedSignatures = [] as SavedSignature[]
} = {}) {
  return mount(PdfToolPicker, {
    props: { editorMode, savedSignatures },
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        'oc-icon': true,
        'oc-drop': ocDropStub
      }
    }
  })
}

describe('PdfToolPicker', () => {
  afterEach(() => hide.mockClear())

  it('offers the tools in the order of the toolbar', () => {
    const wrapper = createWrapper()
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      'Add signature',
      'Highlight text',
      'Add text',
      'Draw',
      'Comments',
      'From this device',
      'From cloud'
    ])
  })

  it.each([
    ['signature', 'selectTool', [AnnotationEditorType.SIGNATURE]],
    ['ink', 'selectTool', [AnnotationEditorType.INK]],
    ['comments', 'selectTool', [AnnotationEditorType.POPUP]],
    ['image-device', 'addImage', ['device']],
    ['image-cloud', 'addImage', ['cloud']]
  ])('closes and chooses %s', async (id, event, args) => {
    const wrapper = createWrapper()
    await wrapper.find(`.pdf-viewer-tool-picker-${id}`).trigger('click')
    expect(hide).toHaveBeenCalled()
    expect(wrapper.emitted(event)).toEqual([args])
  })

  it('shows the active tool and its settings', () => {
    const wrapper = createWrapper({ editorMode: AnnotationEditorType.INK })
    // It opens a drop, no toggle besides that.
    const toggle = wrapper.find('#pdf-viewer-tool-picker-toggle')
    expect(toggle.attributes('aria-pressed')).toBeUndefined()
    expect(toggle.attributes('aria-label')).toBe('Annotation tools: Draw')
    expect(createWrapper().find('#pdf-viewer-tool-picker-toggle').attributes('aria-label')).toBe(
      'Annotation tools'
    )
    // The settings follow the entry of the active tool, as its sub menu.
    const settings = wrapper.find('.pdf-viewer-tool-picker-settings')
    expect(settings.find('[role="group"]').attributes('aria-label')).toBe('Drawing settings')
    expect(settings.element.previousElementSibling).toBe(
      wrapper.find('.pdf-viewer-tool-picker-ink').element.closest('li')
    )
    expect(createWrapper().find('.pdf-viewer-tool-picker-settings').exists()).toBe(false)
  })

  it('emits changed settings for the active tool', () => {
    const wrapper = createWrapper({ editorMode: AnnotationEditorType.INK })
    wrapper
      .findComponent({ name: 'PdfToolSettings' })
      .vm.$emit('update', AnnotationEditorParamsType.INK_THICKNESS, 5)
    expect(wrapper.emitted('updateParam')).toEqual([
      [AnnotationEditorType.INK, AnnotationEditorParamsType.INK_THICKNESS, 5]
    ])
  })

  it('offers saved signatures without another add entry', async () => {
    const signature = {
      uuid: 'a',
      description: 'Jane',
      areContours: false,
      lines: { curves: [] as { points: number[] }[], thickness: 1, width: 1, height: 1 }
    }
    const wrapper = createWrapper({ savedSignatures: [signature] })
    expect(wrapper.find('.pdf-viewer-add-signature').exists()).toBe(false)
    await wrapper.find('.pdf-viewer-saved-signature button').trigger('click')
    expect(hide).toHaveBeenCalled()
    expect(wrapper.emitted('addSavedSignature')).toEqual([[signature]])
  })
})
