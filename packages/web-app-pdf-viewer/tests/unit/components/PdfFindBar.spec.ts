import { defaultPlugins, mount, ocDropStub } from '@opencloud-eu/web-test-helpers'
import PdfFindBar from '../../../src/components/PdfFindBar.vue'
import type { FindOptions, FindResult } from '../../../src/composables/usePdfFindBar'

function createWrapper(findResult: Partial<FindResult> = {}, query = '') {
  const options: FindOptions = {
    highlightAll: true,
    caseSensitive: false,
    entireWord: false,
    matchDiacritics: false
  }
  // The parent's state, like v-model updates it, and what it had when asked to search.
  const parent = { query, options, searches: [] as { query: string; options: FindOptions }[] }
  const wrapper = mount(PdfFindBar, {
    props: {
      findResult: { current: 0, total: 0, notFound: false, ...findResult },
      query,
      'onUpdate:query': (value: string) => {
        parent.query = value
        wrapper.setProps({ query: value })
      },
      options,
      'onUpdate:options': (value: FindOptions) => {
        parent.options = value
        wrapper.setProps({ options: value })
      },
      onFind: () => parent.searches.push({ query: parent.query, options: parent.options })
    },
    global: {
      plugins: [...defaultPlugins()],
      stubs: { 'oc-icon': true, 'oc-drop': ocDropStub }
    },
    attachTo: document.body
  })
  return { wrapper, parent }
}

describe('PdfFindBar', () => {
  it('shows the previous search again where it was when reopened', () => {
    const { wrapper } = createWrapper({}, 'foo')
    expect(wrapper.emitted('find')[0]).toEqual([
      { type: 'highlightallchange', findPrevious: false }
    ])
    wrapper.unmount()
  })

  it('focuses the search input when opened', () => {
    const { wrapper } = createWrapper()
    expect(document.activeElement).toBe(wrapper.find('.pdf-viewer-find-input input').element)
    wrapper.unmount()
  })

  // PDF.js listens on window, e.g. Backspace would delete the selected annotation.
  it('keeps keys from PDF.js', async () => {
    const { wrapper } = createWrapper()
    const onWindowKeydown = vi.fn()
    window.addEventListener('keydown', onWindowKeydown)
    await wrapper.find('.pdf-viewer-find-input input').trigger('keydown', { key: 'Backspace' })
    expect(onWindowKeydown).not.toHaveBeenCalled()
    window.removeEventListener('keydown', onWindowKeydown)
    wrapper.unmount()
  })

  it('can match diacritics', async () => {
    const { wrapper, parent } = createWrapper()
    await wrapper.find('.pdf-viewer-find-match-diacritics input').setValue(true)
    expect(parent.searches[0].options.matchDiacritics).toBe(true)
    wrapper.unmount()
  })

  it('searches while typing', async () => {
    const { wrapper, parent } = createWrapper()
    await wrapper.find('.pdf-viewer-find-input input').setValue('foo')
    expect(wrapper.emitted('find')[0]).toEqual([{ type: '', findPrevious: false }])
    expect(parent.searches[0].query).toBe('foo')
    wrapper.unmount()
  })

  it('jumps to the next and previous match with enter and shift+enter', async () => {
    const { wrapper } = createWrapper()
    const input = wrapper.find('.pdf-viewer-find-input input')
    await input.setValue('foo')
    await input.trigger('keydown', { key: 'Enter' })
    await input.trigger('keydown', { key: 'Enter', shiftKey: true })
    const params = wrapper
      .emitted('find')
      .slice(1)
      .map((args) => args[0])
    expect(params).toEqual([
      { type: 'again', findPrevious: false },
      { type: 'again', findPrevious: true }
    ])
    wrapper.unmount()
  })

  // The parent has the new option already when asked to search.
  it('re-runs the search when an option changes', async () => {
    const { wrapper, parent } = createWrapper()
    await wrapper.find('.pdf-viewer-find-match-case input').setValue(true)
    expect(parent.searches[0].options.caseSensitive).toBe(true)
    expect(wrapper.emitted('find')[0]).toEqual([
      { type: 'casesensitivitychange', findPrevious: false }
    ])
    wrapper.unmount()
  })

  it("updates the options as a whole, not the parent's object", async () => {
    const { wrapper } = createWrapper()
    const { options } = wrapper.props()
    await wrapper.find('.pdf-viewer-find-whole-words input').setValue(true)
    expect(options.entireWord).toBe(false)
    expect(wrapper.emitted<[FindOptions]>('update:options')[0][0].entireWord).toBe(true)
    wrapper.unmount()
  })

  it.each([
    [{ current: 2, total: 7 }, '2/7', '2 of 7 matches'],
    [{ notFound: true }, '0/0', 'Phrase not found']
  ])('shows the result %o', async (result, count, text) => {
    const { wrapper } = createWrapper(result)
    expect(wrapper.find('.pdf-viewer-find-count').exists()).toBe(false)
    await wrapper.find('.pdf-viewer-find-input input').setValue('foo')
    expect(wrapper.find('.pdf-viewer-find-count').text()).toBe(count)
    expect(wrapper.find('.pdf-viewer-find-result').text()).toBe(text)
    wrapper.unmount()
  })

  it('shows when nothing was found', () => {
    const { wrapper } = createWrapper({ current: 0, total: 0, notFound: true }, 'xyz')
    expect(wrapper.find('.pdf-viewer-find-input').classes()).toContain('pdf-viewer-find-not-found')
    expect(wrapper.find('.pdf-viewer-find-result').text()).toBe('Phrase not found')
  })

  // Like the PDF.js viewer, the search input would empty the query instead.
  it('closes on escape in the input and keeps the query', () => {
    const { wrapper, parent } = createWrapper({}, 'foo')
    const input = wrapper.find<HTMLInputElement>('.pdf-viewer-find-input input')
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    input.element.dispatchEvent(event)
    expect(wrapper.emitted('close')).toEqual([[true]])
    expect(event.defaultPrevented).toBe(true)
    expect(parent.query).toBe('foo')
    expect(input.element.value).toBe('foo')
    wrapper.unmount()
  })

  it('closes on escape elsewhere in the find bar, and with its button', async () => {
    const { wrapper } = createWrapper({}, 'foo')
    await wrapper.find('.pdf-viewer-find-next').trigger('keydown', { key: 'Escape' })
    await wrapper.find('.pdf-viewer-find-close').trigger('click')
    expect(wrapper.emitted('close')).toEqual([[true], [false]])
    wrapper.unmount()
  })
})
