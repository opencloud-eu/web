import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import AppDetailsHeader from '../../../src/components/AppDetailsHeader.vue'
import { App, AppVersion } from '../../../src/types'

const mostRecentVersion: AppVersion = {
  version: '2.0.0',
  url: 'https://example.com/app-2.0.0.zip',
  minOpenCloud: '6.0.0'
}

const selectors = {
  title: '.app-details-title',
  meta: '.app-details-meta',
  download: '.app-details-download',
  tag: '[data-testid="tag-button"]'
}

describe('AppDetailsHeader', () => {
  it('renders the name, the authors and the minimum OpenCloud version', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.title).text()).toBe('Draw.io')
    expect(wrapper.find(selectors.meta).text()).toBe('by OpenCloud GmbH, John Doe')
    expect(wrapper.text()).toContain('Requires OpenCloud 6.0.0 or newer')
  })
  it('omits the authors and the minimum OpenCloud version if not present', () => {
    const { wrapper } = getWrapper({
      authors: [],
      mostRecentVersion: { ...mostRecentVersion, minOpenCloud: undefined }
    })
    expect(wrapper.find(selectors.meta).exists()).toBeFalsy()
    expect(wrapper.text()).not.toContain('Requires OpenCloud')
  })
  it('renders the maximum OpenCloud version if present', () => {
    const { wrapper } = getWrapper({
      mostRecentVersion: { ...mostRecentVersion, maxOpenCloud: '7.5.0' }
    })
    expect(wrapper.text()).toContain('Requires OpenCloud 6.0.0 to 7.5.0')
  })
  it('downloads the most recent version', async () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.download).text()).toBe('Download v2.0.0')
    await wrapper.find(selectors.download).trigger('click')
    expect(window.location.href).toBe(mostRecentVersion.url)
  })
  it('emits the clicked tag', async () => {
    const { wrapper } = getWrapper()
    await wrapper.findAll(selectors.tag)[1].trigger('click')
    expect(wrapper.emitted('tagClick')).toEqual([['viewer']])
  })
})

function getWrapper(app: Partial<App> = {}) {
  return {
    wrapper: mount(AppDetailsHeader, {
      props: {
        app: {
          ...mock<App>(),
          name: 'Draw.io',
          subtitle: 'View and edit diagrams',
          authors: [{ name: 'OpenCloud GmbH' }, { name: 'John Doe' }],
          tags: ['editor', 'viewer'],
          mostRecentVersion,
          ...app
        }
      },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
