import { mock } from 'vitest-mock-extended'
import { SearchResource } from '@opencloud-eu/web-client'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import SearchHighlights from '../../../../src/components/Search/SearchHighlights.vue'
import DOMPurify from 'dompurify'

// DOMPurify doesn't sanitize correctly in happy-dom, the sanitizing itself is DOMPurify's job
vi.mock('dompurify', () => ({ default: { sanitize: vi.fn((html: string) => html) } }))

const selectors = {
  content: '.search-highlights-content',
  tag: '.search-highlights-tag'
}

describe('SearchHighlights component', () => {
  it('renders the found content', () => {
    const { wrapper } = getWrapper({ highlights: 'some <mark>found</mark> content' })
    expect(wrapper.find(selectors.content).html()).toContain('<mark>found</mark>')
  })
  it('splits the found content at the match, so the text before it can be cut off', () => {
    const { wrapper } = getWrapper({
      highlights: 'a long text before the <mark>match</mark> and after'
    })
    expect(wrapper.find('.search-highlights-content-before').text()).toBe('a long text before the')
    expect(wrapper.find('.search-highlights-content-match').html()).toContain(
      '<mark>match</mark> and after'
    )
  })
  it('sanitizes the found content and only allows the mark of the match', () => {
    getWrapper({ highlights: 'some <mark>found</mark> content' })
    expect(DOMPurify.sanitize).toHaveBeenCalledWith('some <mark>found</mark> content', {
      ALLOWED_TAGS: ['mark'],
      ALLOWED_ATTR: []
    })
  })
  it('renders only the tags matching the term with the term highlighted', () => {
    const { wrapper } = getWrapper({ tags: ['Invoice', 'private'], term: 'voice' })
    const tags = wrapper.findAll(selectors.tag)
    expect(tags.length).toBe(1)
    expect(tags[0].text()).toBe('Invoice')
    expect(tags[0].find('.oc-filter-highlight-match').text()).toBe('voice')
  })
  it('renders the tags selected in the tag filter', () => {
    const { wrapper } = getWrapper({ tags: ['Invoice', 'private'], filterTags: ['private'] })
    const tags = wrapper.findAll(selectors.tag)
    expect(tags.length).toBe(1)
    expect(tags[0].text()).toBe('private')
  })
  it('renders nothing without found content or matching tags', () => {
    const { wrapper } = getWrapper({ tags: ['private'], term: 'voice' })
    expect(wrapper.find('.search-highlights').exists()).toBeFalsy()
  })
})

function getWrapper({
  highlights = '',
  tags = [],
  term = '',
  filterTags = []
}: { highlights?: string; tags?: string[]; term?: string; filterTags?: string[] } = {}) {
  return {
    wrapper: mount(SearchHighlights, {
      props: { resource: mock<SearchResource>({ highlights, tags }), term, filterTags },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
