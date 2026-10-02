import AppTagFilter from '../../../src/components/AppTagFilter.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { App } from '../../../src/types'

const apps: App[] = [
  { ...mock<App>(), tags: ['wololo', 'foo'] },
  { ...mock<App>(), tags: ['Bar', 'foo'] },
  { ...mock<App>(), tags: [] }
]

const selectors = {
  all: '[data-testid="tag-filter-all"]',
  button: '[data-testid="tag-filter-button"]'
}

describe('AppTagFilter.vue', () => {
  it('renders "All" with the app count first, followed by the tags sorted by count and name', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.all).text()).toBe('All (3)')
    expect(wrapper.findAll(selectors.button).map((b) => b.text())).toEqual([
      'foo (2)',
      'Bar (1)',
      'wololo (1)'
    ])
  })
  it('marks "All" as active if no tag is active', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.all).attributes('aria-pressed')).toBe('true')
  })
  it('marks the active tag', () => {
    const { wrapper } = getWrapper('foo')
    expect(wrapper.find(selectors.all).attributes('aria-pressed')).toBe('false')
    const active = wrapper
      .findAll(selectors.button)
      .filter((b) => b.attributes('aria-pressed') === 'true')
    expect(active.map((b) => b.text())).toEqual(['foo (2)'])
  })
  it('emits the tag on click', async () => {
    const { wrapper } = getWrapper()
    await wrapper.findAll(selectors.button)[0].trigger('click')
    expect(wrapper.emitted('select')).toEqual([['foo']])
  })
  it('emits an empty string on click of the active tag', async () => {
    const { wrapper } = getWrapper('foo')
    await wrapper.findAll(selectors.button)[0].trigger('click')
    expect(wrapper.emitted('select')).toEqual([['']])
  })
  it('emits an empty string on "All" click', async () => {
    const { wrapper } = getWrapper('foo')
    await wrapper.find(selectors.all).trigger('click')
    expect(wrapper.emitted('select')).toEqual([['']])
  })
})

function getWrapper(activeTag = '') {
  return {
    wrapper: mount(AppTagFilter, {
      props: { apps, activeTag },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
