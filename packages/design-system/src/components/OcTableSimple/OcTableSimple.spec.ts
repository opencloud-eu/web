import { shallowMount } from '@opencloud-eu/web-test-helpers'

import Table from './OcTableSimple.vue'

describe('OcTableSimple', () => {
  it('adds hover', () => {
    const wrapper = shallowMount(Table, {
      props: {
        hover: true
      }
    })

    expect(wrapper.attributes('class')).toContain('oc-table-simple-hover')
  })
})
