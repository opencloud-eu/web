import AnnouncementModal from '../../../src/components/AnnouncementModal.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  preloadTextEditor: vi.fn().mockResolvedValue(undefined),
  TextEditorViewer: {
    name: 'TextEditorViewer',
    props: { content: { type: String, default: '' } },
    template: '<div class="text-editor-viewer-stub" />'
  }
}))

describe('AnnouncementModal', () => {
  it('shows a spinner until the editor chunk is loaded', () => {
    const wrapper = mount(AnnouncementModal, {
      props: { modal: {} as any, infoText: '# Details' },
      global: { plugins: [...defaultPlugins()], stubs: { OcSpinner: true } }
    })

    expect(wrapper.find('oc-spinner-stub').exists()).toBe(true)
    expect(wrapper.findComponent<any>({ name: 'TextEditorViewer' }).exists()).toBe(false)
  })

  it('renders the info text in a read-only editor view', async () => {
    const wrapper = mount(AnnouncementModal, {
      props: { modal: {} as any, infoText: '# Details' },
      global: { plugins: [...defaultPlugins()] }
    })
    await flushPromises()

    const viewer = wrapper.findComponent<any>({ name: 'TextEditorViewer' })
    expect(viewer.exists()).toBe(true)
    expect(viewer.props('content')).toEqual('# Details')
  })
})
