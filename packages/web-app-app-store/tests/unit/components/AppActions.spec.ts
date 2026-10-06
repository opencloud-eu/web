import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import AppActions from '../../../src/components/AppActions.vue'
import { App, AppVersion } from '../../../src/types'
import { mock } from 'vitest-mock-extended'

const mostRecentVersion: AppVersion = {
  version: '1.1.0',
  url: 'https://example.com/app-1.1.0.zip'
}

const selectors = {
  downloadButton: 'button'
}

describe('AppActions', () => {
  it('renders a "Download" button', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.downloadButton).text()).toBe('Download')
  })
  it('downloads the most recent version', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find(selectors.downloadButton).trigger('click')
    expect(window.location.href).toBe(mostRecentVersion.url)
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
