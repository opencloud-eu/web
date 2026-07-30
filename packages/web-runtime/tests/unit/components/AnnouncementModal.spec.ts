import AnnouncementModal from '../../../src/components/AnnouncementModal.vue'
import { useTextEditor } from '@opencloud-eu/web-pkg/editor'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

vi.mock('@opencloud-eu/web-pkg/editor', () => ({
  useTextEditor: vi.fn(() => ({ editor: { value: null } })),
  TextEditorContent: {
    name: 'TextEditorContent',
    template: '<div class="text-editor-content-stub" />'
  }
}))

describe('AnnouncementModal', () => {
  it('renders a read-only markdown editor for the info text', () => {
    const wrapper = mount(AnnouncementModal, {
      props: { modal: {} as any, infoText: '# Details' },
      global: { plugins: [...defaultPlugins()] }
    })

    expect(vi.mocked(useTextEditor)).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'markdown', readonly: true })
    )
    expect(wrapper.find('.text-editor-content-stub').exists()).toBe(true)
  })
})
