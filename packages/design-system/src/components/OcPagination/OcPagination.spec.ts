import {
  createRouter,
  defaultPlugins,
  mount,
  PartialComponentProps,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { nextTick } from 'vue'

import Pagination from './OcPagination.vue'
import OcPagination from './OcPagination.vue'
import { mock } from 'vitest-mock-extended'
import { RouteLocationPathRaw, RouterLink } from 'vue-router'

const defaultProps = {
  pages: 5,
  currentPage: 3,
  currentRoute: mock<RouteLocation>({ name: 'files' })
}

const selectors = {
  listItemPage: '.oc-pagination-list-item-page',
  listItemCurrent: '.oc-pagination-list-item-current',
  listItemPrevious: '.oc-pagination-list-item-prev',
  listItemNext: '.oc-pagination-list-item-next',
  listItemEllipsis: '.oc-pagination-list-item-ellipsis',
  listItemLink: '.oc-pagination-list-item-link'
}

describe('OcPagination', () => {
  it('displays all pages', () => {
    const wrapper = getWrapper()

    expect(wrapper.findAll(selectors.listItemPage).length).toBe(5)
    expect(wrapper.findAll(selectors.listItemCurrent).length).toBe(1)
  })

  it('displays prev and next links', () => {
    const wrapper = getWrapper()

    expect(wrapper.find(selectors.listItemPrevious).exists()).toBeTruthy()
    expect(wrapper.find(selectors.listItemNext).exists()).toBeTruthy()
  })

  it('hides prev link if the current page is the first page', () => {
    const wrapper = getWrapper({ currentPage: 1 })

    expect(wrapper.find(selectors.listItemPrevious).exists()).toBeFalsy()
    expect(wrapper.find(selectors.listItemNext).exists()).toBeTruthy()
  })

  it('hides next link if the current page is the last page', () => {
    const wrapper = getWrapper({ currentPage: 5 })

    expect(wrapper.find(selectors.listItemPrevious).exists()).toBeTruthy()
    expect(wrapper.find(selectors.listItemNext).exists()).toBeFalsy()
  })

  it('truncates pages if maxDisplayed prop is set', () => {
    const wrapper = getWrapper({
      pages: 10,
      currentPage: 5,
      maxDisplayed: 3
    })

    expect(wrapper.findAll(selectors.listItemEllipsis).length).toBe(2)
    expect(wrapper.findAll(selectors.listItemLink).length).toBe(4)
    expect(wrapper.findAll(selectors.listItemCurrent).length).toBe(1)
  })

  it('does not truncates pages if length of pages is the same as with ...', async () => {
    const wrapper = getWrapper({
      pages: 4,
      currentPage: 1,
      maxDisplayed: 3
    })

    expect(wrapper.find(selectors.listItemEllipsis).exists()).toBeFalsy()
    expect(wrapper.find(selectors.listItemPrevious).exists()).toBeFalsy()
    expect(wrapper.find(selectors.listItemNext).exists()).toBeTruthy()

    await wrapper.setProps({ currentPage: 2 })

    expect(wrapper.find(selectors.listItemEllipsis).exists()).toBeFalsy()
    expect(wrapper.find(selectors.listItemPrevious).exists()).toBeTruthy()
    expect(wrapper.find(selectors.listItemNext).exists()).toBeTruthy()

    await wrapper.setProps({ currentPage: 4 })

    expect(wrapper.find(selectors.listItemEllipsis).exists()).toBeFalsy()
    expect(wrapper.find(selectors.listItemPrevious).exists()).toBeTruthy()
    expect(wrapper.find(selectors.listItemNext).exists()).toBeFalsy()

    await wrapper.setProps({ pages: 10 })

    expect(wrapper.find(selectors.listItemEllipsis).exists()).toBeTruthy()
  })

  it("doesn't show ellipsis if maxDisplayed prop is set but no pages are removed", () => {
    const wrapper = getWrapper({ maxDisplayed: 3 })

    expect(wrapper.findAll(selectors.listItemEllipsis).length).toBe(0)
    expect(wrapper.findAll(selectors.listItemLink).length).toBe(4)
    expect(wrapper.findAll(selectors.listItemCurrent).length).toBe(1)
  })

  it('builds correct prev and next links', () => {
    const wrapper = getWrapper({ pages: 5, currentPage: 3 })

    const prevItem = wrapper
      .findComponent<typeof RouterLink>(selectors.listItemPrevious)
      .props('to')
    const nextItem = wrapper.findComponent<typeof RouterLink>(selectors.listItemNext).props('to')

    expect((prevItem as RouteLocationPathRaw).query?.page).toBe(2)
    expect((nextItem as RouteLocationPathRaw).query?.page).toBe(4)
  })

  describe('accessibility', () => {
    it('marks only the current page as current, not the links to other pages', async () => {
      const wrapper = await getRoutedWrapper()

      const current = wrapper.findAll('[aria-current]')
      expect(current.length).toBe(1)
      expect(current[0].text()).toBe('3')
      wrapper.unmount()
    })

    it('moves focus to the new current page when the activated link is replaced by it', async () => {
      const wrapper = await getRoutedWrapper()
      const link = wrapper.findAll(selectors.listItemLink).find((l) => l.text() === '4')
      ;(link.element as HTMLElement).focus()
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')

      await wrapper.setProps({ currentPage: 4 })
      await nextTick()

      expect(document.activeElement).toBe(wrapper.find(selectors.listItemCurrent).element)
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
      focusSpy.mockRestore()
      wrapper.unmount()
    })

    it('keeps focus on the activated link if it is still there', async () => {
      const wrapper = await getRoutedWrapper()
      const next = wrapper.find(selectors.listItemNext).element as HTMLElement
      next.focus()

      await wrapper.setProps({ currentPage: 4 })
      await nextTick()

      expect(document.activeElement).toBe(next)
      wrapper.unmount()
    })

    it('does not take focus when the page changes from outside the pagination', async () => {
      const wrapper = await getRoutedWrapper()

      await wrapper.setProps({ currentPage: 4 })
      await nextTick()

      expect(document.activeElement).toBe(document.body)
      wrapper.unmount()
    })
  })
})

async function getRoutedWrapper() {
  const router = createRouter({
    routes: [{ path: '/files', name: 'files', component: { template: '<div />' } }]
  })
  await router.push({ name: 'files', query: { page: 3 } })

  return mount(Pagination, {
    props: { ...defaultProps, currentRoute: router.currentRoute.value },
    attachTo: document.body,
    global: { plugins: [...defaultPlugins(), router], stubs: { 'oc-icon': true } }
  })
}

function getWrapper(props: PartialComponentProps<typeof OcPagination> = {}) {
  return shallowMount(Pagination, {
    props: { ...defaultProps, ...props },
    global: { plugins: [...defaultPlugins()] }
  })
}
