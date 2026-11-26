import { mock } from 'vitest-mock-extended'
import type { Modal } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfAltTextModal from '../../../src/components/PdfAltTextModal.vue'

type Exposed = { onConfirm: () => Promise<void> }

function createWrapper(props: { altText?: string; decorative?: boolean } = {}) {
  const onSave = vi.fn()
  const wrapper = mount(PdfAltTextModal, {
    props: { modal: mock<Modal>(), onSave, ...props },
    global: { plugins: [...defaultPlugins()] }
  })
  return { wrapper, onSave }
}

describe('PdfAltTextModal', () => {
  it('saves the entered description', async () => {
    const { wrapper, onSave } = createWrapper({ altText: 'Old' })
    await wrapper.find('.pdf-viewer-alt-text-input textarea').setValue('  A red square  ')
    await (wrapper.vm as unknown as Exposed).onConfirm()
    expect(onSave).toHaveBeenCalledWith({ altText: 'A red square', decorative: false })
  })

  it('saves decorative images without a description', async () => {
    const { wrapper, onSave } = createWrapper({ altText: 'Old' })
    await wrapper.find('.pdf-viewer-alt-text-decorative input').setValue(true)
    await (wrapper.vm as unknown as Exposed).onConfirm()
    expect(onSave).toHaveBeenCalledWith({ altText: '', decorative: true })
  })
})
