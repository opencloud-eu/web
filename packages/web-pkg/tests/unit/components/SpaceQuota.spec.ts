import { SpaceQuota } from '../../../src/components'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Quota } from '@opencloud-eu/web-client/graph/generated'

describe('SpaceQuota component', () => {
  it('renders the space storage quota label', () => {
    const { wrapper } = getWrapper({ total: 10, used: 1, state: 'normal' })
    expect(wrapper.find('p').text()).toBe('1 B of 10 B used (10%)')
  })
  it('shows the progress bar if the quota is limited', () => {
    const { wrapper } = getWrapper({ total: 10, used: 1, state: 'normal' })
    expect(wrapper.find('oc-progress-stub').exists()).toBeTruthy()
  })
  it('hides the progress bar and shows "no restriction" if the quota is unlimited', () => {
    const { wrapper } = getWrapper({ total: 0, used: 1, state: 'normal' })
    expect(wrapper.find('oc-progress-stub').exists()).toBeFalsy()
    expect(wrapper.find('p').text()).toBe('1 B used (no restriction)')
  })
})

function getWrapper(spaceQuota: Quota) {
  return {
    wrapper: shallowMount(SpaceQuota, {
      props: {
        spaceQuota
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
