import { defaultPlugins, mount, ocDropStub } from '@opencloud-eu/web-test-helpers'
import PdfSplitToolButton from '../../../src/components/PdfSplitToolButton.vue'

const hide = ocDropStub.methods.hide as ReturnType<typeof vi.fn>

function createWrapper(props: { dropWidthClass?: string } = {}) {
  return mount(PdfSplitToolButton, {
    props: {
      tool: { id: 'ink', label: 'Draw', icon: 'pencil' },
      dropTitle: 'Drawing settings',
      isActive: true,
      ...props
    },
    slots: {
      default: `<template #default="{ hide }">
        <button class="drop-content" @click="hide">Done</button>
      </template>`
    },
    global: {
      plugins: [...defaultPlugins()],
      stubs: { 'oc-icon': true, 'oc-drop': ocDropStub }
    }
  })
}

describe('PdfSplitToolButton', () => {
  afterEach(() => hide.mockClear())

  it('selects the tool', async () => {
    const wrapper = createWrapper()
    const button = wrapper.find('.pdf-viewer-tool-ink')
    expect(button.attributes('aria-pressed')).toBe('true')
    await button.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('opens the drop with the chevron next to the tool', async () => {
    const wrapper = createWrapper()
    const toggle = wrapper.find('#pdf-viewer-ink-settings-toggle')
    expect(toggle.attributes('aria-label')).toBe('Drawing settings')
    await toggle.trigger('pointerdown')
    expect(wrapper.emitted('openDrop')).toHaveLength(1)
  })

  it('takes a width for the drop, e.g. for the descriptions of saved signatures', () => {
    expect(createWrapper().findComponent({ name: 'OcDropStub' }).classes()).toContain('w-64')
    expect(
      createWrapper({ dropWidthClass: 'w-80' }).findComponent({ name: 'OcDropStub' }).classes()
    ).toContain('w-80')
  })

  it('lets the drop content close the drop', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.drop-content').trigger('click')
    expect(hide).toHaveBeenCalled()
  })
})
