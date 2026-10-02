import { App, AppVersion } from '../../../src/types'
import AppVersions from '../../../src/components/AppVersions.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'

const validVersions: AppVersion[] = [
  { url: 'https://wololo.com/download-1.3.0.zip', version: '1.3.0', minOpenCloud: '6.5.0' },
  { url: 'https://wololo.com/download-1.2.0.zip', version: '1.2.0' },
  { url: 'https://wololo.com/download-1.1.0.zip', version: '1.1.0', minOpenCloud: '6.0.0' },
  { url: 'https://wololo.com/download-1.0.0.zip', version: '1.0.0' }
]
const invalidVersions: AppVersion[] = [
  { url: 'wololo', version: '0.9.0' },
  { url: 'https://wololo.com/download-0.8.0.zip', version: '' }
]

const selectors = {
  row: '.app-version',
  number: '.app-version-number',
  latest: '.app-version-latest',
  minOpenCloud: '.app-version-min-opencloud',
  downloadButton: '.app-download-button',
  toggle: '.app-versions-toggle'
}

describe('AppVersions.vue', () => {
  it('renders the first three valid versions and a toggle to show all of them', async () => {
    const { wrapper } = getWrapper()
    expect(wrapper.findAll(selectors.number).map((n) => n.text())).toEqual([
      'v1.3.0',
      'v1.2.0',
      'v1.1.0'
    ])
    expect(wrapper.find(selectors.toggle).text()).toBe('Show all 4 versions')

    await wrapper.find(selectors.toggle).trigger('click')
    expect(wrapper.findAll(selectors.row)).toHaveLength(validVersions.length)
    expect(wrapper.find(selectors.toggle).text()).toBe('Show less')
  })
  it('renders no toggle if there are only up to three versions', () => {
    const { wrapper } = getWrapper(validVersions.slice(0, 3))
    expect(wrapper.find(selectors.toggle).exists()).toBeFalsy()
  })
  it('marks only the first version as latest', () => {
    const { wrapper } = getWrapper()
    const rows = wrapper.findAll(selectors.row)
    expect(rows[0].find(selectors.latest).exists()).toBeTruthy()
    expect(wrapper.findAll(selectors.latest)).toHaveLength(1)
  })
  it('renders the minimum required OpenCloud version if present', () => {
    const { wrapper } = getWrapper()
    const rows = wrapper.findAll(selectors.row)
    expect(rows[0].find(selectors.minOpenCloud).text()).toBe('OpenCloud 6.5.0+')
    expect(rows[1].find(selectors.minOpenCloud).exists()).toBeFalsy()
  })
  it('renders a download button per version', () => {
    const { wrapper } = getWrapper()
    const button = wrapper.findAll(selectors.row)[1].find(selectors.downloadButton)
    expect(button.attributes('aria-label')).toBe('Download version 1.2.0')
  })
})

function getWrapper(versions = [...validVersions, ...invalidVersions]) {
  const app: App = { ...mock<App>({}), versions, mostRecentVersion: versions[0] }
  return {
    wrapper: mount(AppVersions, {
      props: { app },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
