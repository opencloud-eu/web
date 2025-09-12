import { shallowMount } from '@opencloud-eu/web-test-helpers'
import Cell from './OcTableCell.vue'

describe('OcTableCell', () => {
  it('Uses correct element', () => {
    const wrapper = shallowMount(Cell, {
      props: {
        type: 'th',
        alignH: 'right',
        alignV: 'bottom',
        width: 'shrink'
      },
      slots: {
        default: 'Hello world!'
      }
    })

    expect(wrapper.element.tagName).toBe('TH')
    expect(wrapper.attributes('class')).toContain('text-right')
    expect(wrapper.attributes('class')).toContain('align-bottom')
    expect(wrapper.attributes('class')).toContain('w-px')
    expect(wrapper.html()).toMatchSnapshot()
  })
})
