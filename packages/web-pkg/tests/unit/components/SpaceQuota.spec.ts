import { SpaceQuota } from '../../../src/components'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Quota } from '@opencloud-eu/web-client/graph/generated'

describe('SpaceQuota component', () => {
  it('renders the space storage quota label', () => {
    const { wrapper } = getWrapper({ total: 10, used: 1, state: 'normal' })
    expect(wrapper.find('.space-quota').exists()).toBeTruthy()
    expect(wrapper.html()).toMatchSnapshot()
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
