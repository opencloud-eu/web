import { OcProgress } from '@opencloud-eu/design-system/components'
import { SpaceQuota } from '../../../src/components'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Quota } from '@opencloud-eu/web-client/graph/generated'

describe('SpaceQuota component', () => {
  it('renders the space storage quota label', () => {
    const { wrapper } = getWrapper({ total: 10, used: 1, state: 'normal' })
    expect(wrapper.find('.space-quota').exists()).toBeTruthy()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it.each([
    { state: 'normal', expectedVariation: 'primary' },
    { state: 'nearing', expectedVariation: 'warning' },
    { state: 'critical', expectedVariation: 'warning' },
    { state: 'exceeded', expectedVariation: 'danger' }
  ])('renders the progress variant correctly', (dataSet) => {
    const { wrapper } = getWrapper({ total: 10, used: 1, state: dataSet.state })
    const progressBar = wrapper.findComponent<typeof OcProgress>('.space-quota oc-progress-stub')
    expect(progressBar.exists()).toBeTruthy()
    expect(progressBar.props().variation).toBe(dataSet.expectedVariation)
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
