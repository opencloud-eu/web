import { defaultPlugins, PartialComponentProps, shallowMount } from '@opencloud-eu/web-test-helpers'

import OcButton from '../OcButton/OcButton.vue'
import OcPaginationInline from './OcPaginationInline.vue'

const defaultProps = {
  pages: 5,
  currentPage: 3
}

const selectors = {
  nav: '.oc-pagination-inline',
  info: '.oc-pagination-inline-info',
  prev: '.oc-pagination-inline-prev',
  next: '.oc-pagination-inline-next'
}

describe('OcPaginationInline', () => {
  it('displays the current page and the total amount of pages', () => {
    const wrapper = getWrapper()

    expect(wrapper.find(selectors.info).text()).toBe('Page 3 of 5')
  })

  it('renders nothing if there is only one page', () => {
    const wrapper = getWrapper({ pages: 1, currentPage: 1 })

    expect(wrapper.find(selectors.nav).exists()).toBeFalsy()
  })

  it('emits the previous page', () => {
    const wrapper = getWrapper()
    wrapper.find(selectors.prev).trigger('click')

    expect(wrapper.emitted('update:currentPage')).toEqual([[2]])
  })

  it('emits the next page', () => {
    const wrapper = getWrapper()
    wrapper.find(selectors.next).trigger('click')

    expect(wrapper.emitted('update:currentPage')).toEqual([[4]])
  })

  it('disables the prev button on the first page', () => {
    const wrapper = getWrapper({ currentPage: 1 })

    expect(wrapper.findComponent<typeof OcButton>(selectors.prev).props('disabled')).toBeTruthy()
    expect(wrapper.findComponent<typeof OcButton>(selectors.next).props('disabled')).toBeFalsy()
  })

  it('disables the next button on the last page', () => {
    const wrapper = getWrapper({ currentPage: 5 })

    expect(wrapper.findComponent<typeof OcButton>(selectors.prev).props('disabled')).toBeFalsy()
    expect(wrapper.findComponent<typeof OcButton>(selectors.next).props('disabled')).toBeTruthy()
  })

  it('clamps a current page that is out of range', () => {
    const wrapper = getWrapper({ currentPage: 42 })

    expect(wrapper.find(selectors.info).text()).toBe('Page 5 of 5')
    expect(wrapper.find(selectors.next).attributes('disabled')).toBeTruthy()
  })
})

function getWrapper(props: PartialComponentProps<typeof OcPaginationInline> = {}) {
  return shallowMount(OcPaginationInline, {
    props: { ...defaultProps, ...props },
    global: { plugins: [...defaultPlugins()] }
  })
}
