import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfPageNumber from '../../../src/components/PdfPageNumber.vue'

function createWrapper(pageLabels?: string[]) {
  return mount(PdfPageNumber, {
    props: { pageNumber: 3, pagesCount: 5, pageLabels },
    attachTo: document.body,
    global: { plugins: [...defaultPlugins()] }
  })
}

async function enter(wrapper: ReturnType<typeof createWrapper>, value: string) {
  const input = wrapper.find('input')
  input.element.value = value
  await input.trigger('change')
}

describe('PdfPageNumber', () => {
  it('shows the page number of all pages', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('input').element.value).toBe('3')
    expect(wrapper.find('.pdf-viewer-pages-count').text()).toBe('of 5')
  })

  it('goes to an entered page, ignoring pages that do not exist', async () => {
    const wrapper = createWrapper()
    await enter(wrapper, '9')
    await enter(wrapper, '4')
    expect(wrapper.emitted('goToPage')).toEqual([[4]])
    expect(wrapper.find('input').element.value).toBe('3')
  })

  it('shows page labels that come after the document', async () => {
    const wrapper = createWrapper()
    await wrapper.setProps({ pageLabels: ['i', 'ii', 'iii', '1', '2'] })
    expect(wrapper.find('input').element.value).toBe('iii')
  })

  it('shows and takes page labels, like the PDF.js viewer', async () => {
    const wrapper = createWrapper(['i', 'ii', 'iii', '1', '2'])
    expect(wrapper.find('input').element.value).toBe('iii')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    // Long labels get cut off in the field.
    expect(wrapper.find('input').attributes('title')).toBe('iii')
    expect(wrapper.find('.pdf-viewer-pages-count').text()).toBe('(3 of 5)')
    await enter(wrapper, 'ii')
    // A label wins over the page number.
    await enter(wrapper, '1')
    expect(wrapper.emitted('goToPage')).toEqual([[2], [4]])
  })

  // E.g. for the "Go to page" buttons of forms, also while the focus is somewhere else.
  it('focuses and selects the page number', () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input').element
    const select = vi.spyOn(input, 'select')
    wrapper.vm.select()
    expect(document.activeElement).toBe(input)
    expect(select).toHaveBeenCalled()
    wrapper.unmount()
  })
})
