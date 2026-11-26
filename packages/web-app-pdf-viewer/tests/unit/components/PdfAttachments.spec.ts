import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfAttachments from '../../../src/components/PdfAttachments.vue'

function createWrapper() {
  return mount(PdfAttachments, {
    props: {
      attachments: [
        { key: '0', id: '0', filename: 'invoice.xml', description: 'Invoice data' },
        { key: 'notes', filename: 'notes' }
      ]
    },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true, 'resource-icon': true } }
  })
}

describe('PdfAttachments', () => {
  it('shows the files with their description or type', () => {
    const [invoice, notes] = createWrapper().findAll('.pdf-viewer-attachment')
    expect(invoice.text()).toContain('invoice.xml')
    expect(invoice.text()).toContain('Invoice data')
    expect(notes.text()).toContain('File')
  })

  it('shows the icons of files in OpenCloud', () => {
    const icon = createWrapper().findComponent({ name: 'ResourceIcon' })
    expect(icon.props('resource')).toMatchObject({ name: 'invoice.xml', extension: 'xml' })
  })

  it('downloads a file when clicking it', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.pdf-viewer-attachment')[1].trigger('click')
    expect(wrapper.emitted('open')).toEqual([[{ key: 'notes', filename: 'notes' }]])
  })
})
