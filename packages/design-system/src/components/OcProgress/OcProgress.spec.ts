import { shallowMount } from '@opencloud-eu/web-test-helpers'
import Progress from './OcProgress.vue'

describe('OcProgress', () => {
  it('sets correct classes', () => {
    const wrapper = shallowMount(Progress, {
      props: {
        value: 3,
        max: 10,
        size: 'small'
      }
    })

    expect(wrapper.attributes('class')).toContain('oc-progress-small')
    expect(wrapper.html()).toMatchSnapshot()
  })
})
