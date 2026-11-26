import { mock } from 'vitest-mock-extended'
import type { Modal } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfCommentModal from '../../../src/components/PdfCommentModal.vue'

type Exposed = { onConfirm: () => Promise<void> }

function createWrapper(comment = '') {
  const onSave = vi.fn()
  const wrapper = mount(PdfCommentModal, {
    props: { modal: mock<Modal>(), comment, onSave },
    global: { plugins: [...defaultPlugins()] }
  })
  return { wrapper, onSave }
}

describe('PdfCommentModal', () => {
  it('can only be saved once the text changed', async () => {
    const { wrapper } = createWrapper('Old')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
    await wrapper.find('textarea').setValue('New')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
  })

  it('saves the text', async () => {
    const { wrapper, onSave } = createWrapper()
    await wrapper.find('textarea').setValue('A comment')
    await (wrapper.vm as unknown as Exposed).onConfirm()
    expect(onSave).toHaveBeenCalledWith('A comment')
  })
})
