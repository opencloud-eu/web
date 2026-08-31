import OcFilterHighlight from './OcFilterHighlight.vue'
import { shallowMount } from '@opencloud-eu/web-test-helpers'

describe('OcFilterHighlight', () => {
  it('renders the text as-is if no term is given', () => {
    const { wrapper } = getWrapper({ text: 'Marie Curie' })
    expect(wrapper.text()).toBe('Marie Curie')
    expect(wrapper.findAll('.oc-filter-highlight-match').length).toBe(0)
  })

  it('wraps the occurrences of the term', () => {
    const { wrapper } = getWrapper({ text: 'Marie Curie', term: 'curie' })
    expect(wrapper.text()).toBe('Marie Curie')

    const highlights = wrapper.findAll('.oc-filter-highlight-match')
    expect(highlights.length).toBe(1)
    expect(highlights[0].text()).toBe('Curie')
  })

  it('renders the text as-is if the term is only whitespace', () => {
    const { wrapper } = getWrapper({ text: 'Marie Curie', term: '   ' })
    expect(wrapper.text()).toBe('Marie Curie')
    expect(wrapper.findAll('.oc-filter-highlight-match').length).toBe(0)
  })

  it('ignores surrounding whitespace of the term', () => {
    const { wrapper } = getWrapper({ text: 'Marie Curie', term: ' curie ' })
    expect(wrapper.findAll('.oc-filter-highlight-match').length).toBe(1)
  })

  it('wraps every occurrence of the term', () => {
    const { wrapper } = getWrapper({ text: 'mama', term: 'ma' })
    expect(wrapper.text()).toBe('mama')
    expect(wrapper.findAll('.oc-filter-highlight-match').length).toBe(2)
  })

  it('treats the term literally', () => {
    const { wrapper } = getWrapper({ text: 'a.b', term: '.' })

    const highlights = wrapper.findAll('.oc-filter-highlight-match')
    expect(highlights.length).toBe(1)
    expect(highlights[0].text()).toBe('.')
  })

  it('renders nothing if the term is not found', () => {
    const { wrapper } = getWrapper({ text: 'Marie Curie', term: 'einstein' })
    expect(wrapper.text()).toBe('Marie Curie')
    expect(wrapper.findAll('.oc-filter-highlight-match').length).toBe(0)
  })

  it('renders nothing for empty text', () => {
    const { wrapper } = getWrapper({ term: 'curie' })
    expect(wrapper.text()).toBe('')
  })

  it('updates the highlights when the term changes', async () => {
    const { wrapper } = getWrapper({ text: 'Marie Curie', term: 'curie' })

    await wrapper.setProps({ term: 'marie' })

    const highlights = wrapper.findAll('.oc-filter-highlight-match')
    expect(highlights.length).toBe(1)
    expect(highlights[0].text()).toBe('Marie')
  })
})

function getWrapper(props: { text?: string; term?: string } = {}) {
  return { wrapper: shallowMount(OcFilterHighlight, { props }) }
}
