import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import AppActions from '../../../src/components/AppActions.vue'
import { App, AppVersion } from '../../../src/types'
import { mock } from 'vitest-mock-extended'

const mostRecentVersion: AppVersion = {
  version: '1.1.0',
  url: 'https://example.com/app-1.1.0.zip'
}

const selectors = {
  downloadLink: 'a'
}

describe('AppActions', () => {
  it('renders a "Download" link to the most recent version', () => {
    const { wrapper } = getWrapper()
    const link = wrapper.find(selectors.downloadLink)
    expect(link.text()).toBe('Download')
    expect(link.attributes('href')).toBe(mostRecentVersion.url)
  })
})

function getWrapper() {
  const app = { ...mock<App>({}), mostRecentVersion }
  return {
    wrapper: mount(AppActions, {
      props: { app },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
