import App from '../../src/App.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'

describe('Files App', () => {
  it('does not add the routed view wrapper to the tab order', () => {
    const { wrapper } = getWrapper()
    const filesWrapper = wrapper.find('.files-wrapper')
    expect(filesWrapper.exists()).toBeTruthy()
    expect(filesWrapper.attributes('tabindex')).toBeUndefined()
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ path: '/files/spaces/personal' })
  })

  return {
    wrapper: shallowMount(App, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
