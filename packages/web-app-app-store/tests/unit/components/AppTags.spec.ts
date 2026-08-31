import AppTags from '../../../src/components/AppTags.vue'
import { mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { App } from '../../../src/types'

const tags: string[] = ['someTag', 'anotherTag', 'wololo-tag']

const selectors = {
  button: '[data-testid="tag-button"]',
  highlight: '.oc-filter-highlight-match'
}

describe('AppTags.vue', () => {
  it('renders one button per tag', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.findAll(selectors.button)).toHaveLength(tags.length)
  })
  it('shows the tag text as button text', () => {
    const { wrapper } = getWrapper()
    const buttons = wrapper.findAll(selectors.button)
    for (let i = 0; i < buttons.length; i++) {
      expect(buttons[i].text()).toBe(tags[i])
    }
  })
  it('emits click event on tag click', () => {
    const { wrapper } = getWrapper()
    wrapper.find(selectors.button).trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
  it('highlights the occurrences of the given term', () => {
    const { wrapper } = getWrapper('tag')
    const highlights = wrapper.findAll(selectors.highlight)
    expect(highlights.map((h) => h.text())).toEqual(['Tag', 'Tag', 'tag'])
  })
})

const getWrapper = (term = '') => {
  const app = { ...mock<App>({}), tags }

  return {
    wrapper: mount(AppTags, {
      props: { app, term }
    })
  }
}
