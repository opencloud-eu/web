import { mock } from 'vitest-mock-extended'
import { SearchResource } from '@opencloud-eu/web-client'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import SearchHighlights from '../../../../src/components/Search/SearchHighlights.vue'

const selectors = {
  content: '.search-highlights-content',
  tag: '.search-highlights-tag'
}

describe('SearchHighlights component', () => {
  it('renders the found content', () => {
    const { wrapper } = getWrapper({ highlights: 'some <mark>found</mark> content' })
    expect(wrapper.find(selectors.content).html()).toContain('<mark>found</mark>')
  })
  it('renders only the tags matching the term with the term highlighted', () => {
    const { wrapper } = getWrapper({ tags: ['Invoice', 'private'], term: 'voice' })
    const tags = wrapper.findAll(selectors.tag)
    expect(tags.length).toBe(1)
    expect(tags[0].text()).toBe('Invoice')
    expect(tags[0].find('.oc-filter-highlight-match').text()).toBe('voice')
  })
  it('renders nothing without found content or matching tags', () => {
    const { wrapper } = getWrapper({ tags: ['private'], term: 'voice' })
    expect(wrapper.find('.search-highlights').exists()).toBeFalsy()
  })
})

function getWrapper({
  highlights = '',
  tags = [],
  term = ''
}: { highlights?: string; tags?: string[]; term?: string } = {}) {
  return {
    wrapper: mount(SearchHighlights, {
      props: { resource: mock<SearchResource>({ highlights, tags }), term },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
