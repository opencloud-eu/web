import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import AppDetailsInfo from '../../../src/components/AppDetailsInfo.vue'
import { App } from '../../../src/types'

describe('AppDetailsInfo', () => {
  it('renders all rows', () => {
    const { wrapper } = getWrapper()
    expect(getRows(wrapper)).toEqual([
      ['Author', 'OpenCloud GmbH'],
      ['Version', '2.0.0'],
      ['Requires', 'OpenCloud 6.0.0+'],
      ['Resources', 'GitHub']
    ])
  })
  it('omits rows without a value', () => {
    const { wrapper } = getWrapper({
      authors: [],
      resources: [],
      mostRecentVersion: { version: '2.0.0', url: 'https://example.com/app.zip' }
    })
    expect(getRows(wrapper)).toEqual([['Version', '2.0.0']])
  })
})

function getRows(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper
    .findAll('.app-details-info-row')
    .map((row) => [row.find('dt').text(), row.find('dd').text()])
}

function getWrapper(app: Partial<App> = {}) {
  return {
    wrapper: mount(AppDetailsInfo, {
      props: {
        app: {
          ...mock<App>(),
          authors: [{ name: 'OpenCloud GmbH' }],
          resources: [{ label: 'GitHub', url: 'https://github.com/opencloud-eu' }],
          mostRecentVersion: {
            version: '2.0.0',
            url: 'https://example.com/app.zip',
            minOpenCloud: '6.0.0'
          },
          ...app
        }
      },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
