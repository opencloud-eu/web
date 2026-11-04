import { ref, unref } from 'vue'
import { usePagination, useScrollTo } from '../../../../src/composables'
import { EventBus, eventBus } from '../../../../src/services'
import { createRouter, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'

describe('usePagination', () => {
  describe('computed items', () => {
    const items = [1, 2, 3, 4, 5, 6]

    it.each([
      { currentPage: 1, itemsPerPage: 100, expected: [1, 2, 3, 4, 5, 6] },
      { currentPage: 1, itemsPerPage: 2, expected: [1, 2] },
      { currentPage: 2, itemsPerPage: 2, expected: [3, 4] },
      { currentPage: 9, itemsPerPage: 4, expected: [5, 6] }
    ])('returns proper paginated items', ({ currentPage, itemsPerPage, expected }) => {
      getWrapper({
        setup: ({ items }) => {
          expect(unref(items)).toEqual(expected)
        },
        items,
        currentPage,
        itemsPerPage
      })
    })
  })
  describe('computed page', () => {
    it.each([
      { currentPage: 2, expected: 2 },
      { currentPage: 9, expected: 2 }
    ])('clamps page $currentPage to $expected', ({ currentPage, expected }) => {
      getWrapper({
        setup: ({ page }) => {
          expect(unref(page)).toBe(expected)
        },
        items: [1, 2, 3, 4, 5, 6],
        currentPage,
        itemsPerPage: 4
      })
    })
  })
  describe('computed total', () => {
    it.each([
      { itemCount: 1, itemsPerPage: 100, expected: 1 },
      { itemCount: 101, itemsPerPage: 100, expected: 2 },
      { itemCount: 201, itemsPerPage: 100, expected: 3 }
    ])('returns proper total pages', ({ itemCount, itemsPerPage, expected }) => {
      const items = Array(itemCount).fill(1)
      getWrapper({
        setup: ({ total }) => {
          expect(unref(total)).toEqual(expected)
        },
        items,
        currentPage: 1,
        itemsPerPage
      })
    })
  })
  describe('computed perPage', () => {
    it('falls back to the default while the route query is still unset', async () => {
      const router = createRouter({ routes: [{ path: '/', redirect: null }] })
      router.push('/')
      await router.isReady()

      const mocks = { $router: router }
      getComposableWrapper(
        () => {
          const { items: paginatedItems, perPage } = usePagination({
            items: ref([1, 2, 3, 4, 5, 6]),
            perPageDefault: '2',
            perPageStoragePrefix: 'unit-tests'
          })

          expect(unref(perPage)).toBe(2)
          expect(unref(paginatedItems)).toEqual([1, 2])
        },
        { mocks, provide: mocks }
      )
    })
  })
  describe('event bus subscription', () => {
    it('unsubscribes from the page navigation event on unmount', () => {
      const subscribeSpy = vi.spyOn(eventBus, 'subscribe')
      const unsubscribeSpy = vi.spyOn(eventBus, 'unsubscribe')

      const { wrapper } = getWrapper({
        setup: () => undefined,
        items: [1, 2, 3],
        currentPage: 1,
        itemsPerPage: 2,
        handlePageNavigation: true
      })

      const token = subscribeSpy.mock.results[0].value
      expect(subscribeSpy).toHaveBeenCalledWith('app.files.navigate.page', expect.anything())
      expect(unsubscribeSpy).not.toHaveBeenCalled()

      wrapper.unmount()

      expect(unsubscribeSpy).toHaveBeenCalledWith('app.files.navigate.page', token)
    })
    it('ignores the page navigation event when page navigation is not enabled', async () => {
      const router = createRouter({ routes: [{ path: '/', redirect: null }] })
      router.push('/')
      await router.isReady()
      const pushSpy = vi.spyOn(router, 'push')
      const publishSpy = vi.spyOn(eventBus, 'publish')

      const mocks = { $router: router }
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `${i + 1}` }))
      const wrapper = getComposableWrapper(
        () => usePagination({ items: ref(items), perPage: 20, perPageStoragePrefix: 'unit-tests' }),
        { mocks, provide: mocks }
      )

      eventBus.publish('app.files.navigate.page', {
        resourceId: '25',
        forceScroll: true,
        topbarElement: 'files-app-bar'
      })
      await flushPromises()

      expect(pushSpy).not.toHaveBeenCalled()
      expect(publishSpy).not.toHaveBeenCalledWith('app.files.navigate.scrollTo', expect.anything())
      wrapper.unmount()
    })
    it('does not loop when the resource is on the shown page but not rendered', async () => {
      const router = createRouter({ routes: [{ path: '/', redirect: null }] })
      router.push('/')
      await router.isReady()

      const publish = EventBus.prototype.publish.bind(eventBus)
      let pageNavigations = 0
      const publishSpy = vi.spyOn(eventBus, 'publish').mockImplementation((topic, data) => {
        if (topic === 'app.files.navigate.page') {
          pageNavigations++
          if (pageNavigations > 10) {
            return
          }
        }
        publish(topic, data)
      })

      const mocks = { $router: router }
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `${i + 1}` }))
      const wrapper = getComposableWrapper(
        () => {
          usePagination({
            items: ref(items),
            perPage: 20,
            perPageStoragePrefix: 'unit-tests',
            handlePageNavigation: true
          })
          return useScrollTo()
        },
        { mocks, provide: mocks }
      )

      wrapper.vm.scrollToResource('5', { forceScroll: true, topbarElement: 'files-app-bar' })
      await flushPromises()
      wrapper.unmount()
      publishSpy.mockRestore()

      expect(pageNavigations).toBe(1)
    })
    it('switches to the page of the resource and scrolls to it', async () => {
      const router = createRouter({ routes: [{ path: '/', redirect: null }] })
      router.push('/')
      await router.isReady()
      const publishSpy = vi.spyOn(eventBus, 'publish')

      const mocks = { $router: router }
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `${i + 1}` }))
      const wrapper = getComposableWrapper(
        () =>
          usePagination({
            items: ref(items),
            perPage: 20,
            perPageStoragePrefix: 'unit-tests',
            handlePageNavigation: true
          }),
        { mocks, provide: mocks }
      )

      eventBus.publish('app.files.navigate.page', {
        resourceId: '25',
        forceScroll: true,
        topbarElement: 'files-app-bar'
      })
      await flushPromises()

      expect(unref(router.currentRoute).query.page).toBe('2')
      expect(publishSpy).toHaveBeenCalledWith('app.files.navigate.scrollTo', {
        resourceId: '25',
        forceScroll: true,
        topbarElement: 'files-app-bar'
      })
      wrapper.unmount()
    })
    it('stays in the current folder when its name contains a hash', async () => {
      const router = createRouter({
        routes: [
          { name: 'files-public-link', path: '/files/link/:driveAliasAndItem(.*)?', component: {} }
        ]
      })
      router.push('/files/link/public/token/Doc%23A')
      await router.isReady()

      const mocks = { $router: router }
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `${i + 1}` }))
      const wrapper = getComposableWrapper(
        () =>
          usePagination({
            items: ref(items),
            perPage: 20,
            perPageStoragePrefix: 'unit-tests',
            handlePageNavigation: true
          }),
        { mocks, provide: mocks }
      )

      eventBus.publish('app.files.navigate.page', {
        resourceId: '25',
        forceScroll: true,
        topbarElement: 'files-app-bar'
      })
      await flushPromises()

      expect(unref(router.currentRoute).path).toBe('/files/link/public/token/Doc%23A')
      expect(unref(router.currentRoute).query.page).toBe('2')
      wrapper.unmount()
    })
  })
})

function getWrapper({
  setup,
  items,
  currentPage,
  itemsPerPage,
  handlePageNavigation = false
}: {
  setup: (instance: ReturnType<typeof usePagination>) => void
  items: number[]
  currentPage: number
  itemsPerPage: number
  handlePageNavigation?: boolean
}) {
  return {
    wrapper: getComposableWrapper(() => {
      const instance = usePagination({
        items: ref(items),
        page: currentPage,
        perPage: itemsPerPage,
        perPageStoragePrefix: 'unit-tests',
        handlePageNavigation
      })
      setup(instance)
    })
  }
}
