import { ref, unref } from 'vue'
import { usePagination } from '../../../../src/composables'
import { eventBus } from '../../../../src/services'
import { createRouter, getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('usePagination', () => {
  describe('computed items', () => {
    const items = [1, 2, 3, 4, 5, 6]

    it.each([
      { currentPage: 1, itemsPerPage: 100, expected: [1, 2, 3, 4, 5, 6] },
      { currentPage: 1, itemsPerPage: 2, expected: [1, 2] },
      { currentPage: 2, itemsPerPage: 2, expected: [3, 4] }
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
        itemsPerPage: 2
      })

      const token = subscribeSpy.mock.results[0].value
      expect(subscribeSpy).toHaveBeenCalledWith('app.files.navigate.page', expect.anything())
      expect(unsubscribeSpy).not.toHaveBeenCalled()

      wrapper.unmount()

      expect(unsubscribeSpy).toHaveBeenCalledWith('app.files.navigate.page', token)
    })
  })
})

function getWrapper({
  setup,
  items,
  currentPage,
  itemsPerPage
}: {
  setup: (instance: ReturnType<typeof usePagination>) => void
  items: number[]
  currentPage: number
  itemsPerPage: number
}) {
  return {
    wrapper: getComposableWrapper(() => {
      const instance = usePagination({
        items: ref(items),
        page: currentPage,
        perPage: itemsPerPage,
        perPageStoragePrefix: 'unit-tests'
      })
      setup(instance)
    })
  }
}
