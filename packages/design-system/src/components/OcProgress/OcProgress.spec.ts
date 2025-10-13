import { shallowMount } from '@opencloud-eu/web-test-helpers'
import Progress, { Props } from './OcProgress.vue'

describe('OcProgress', () => {
  it.each<{ size: Props['size']; expectedSize: string }>([
    { size: 'default', expectedSize: 'h-4' },
    { size: 'small', expectedSize: 'h-1' },
    { size: 'xsmall', expectedSize: 'h-0.5' }
  ])('sets correct classes for size %s', ({ size, expectedSize }) => {
    const wrapper = shallowMount(Progress, {
      props: {
        value: 3,
        max: 10,
        size
      }
    })

    expect(wrapper.attributes('class')).toContain(expectedSize)
    expect(wrapper.html()).toMatchSnapshot()
  })
})
