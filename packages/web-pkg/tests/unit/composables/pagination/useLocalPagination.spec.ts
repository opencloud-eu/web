import { nextTick, ref, unref } from 'vue'
import { LocalPaginationResult, useLocalPagination } from '../../../../src/composables'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useLocalPagination', () => {
  it.each([
    { currentPage: 1, perPage: 10, expected: [1, 2, 3, 4, 5, 6] },
    { currentPage: 1, perPage: 2, expected: [1, 2] },
    { currentPage: 2, perPage: 2, expected: [3, 4] },
    { currentPage: 3, perPage: 2, expected: [5, 6] }
  ])('returns the items of the current page', ({ currentPage, perPage, expected }) => {
    const pagination = getPagination([1, 2, 3, 4, 5, 6], perPage)
    pagination.currentPage.value = currentPage

    expect(unref(pagination.paginatedItems)).toEqual(expected)
  })

  it.each([
    { itemCount: 0, expected: 1 },
    { itemCount: 1, expected: 1 },
    { itemCount: 20, expected: 1 },
    { itemCount: 21, expected: 2 },
    { itemCount: 41, expected: 3 }
  ])('returns the total amount of pages', ({ itemCount, expected }) => {
    const { totalPages } = getPagination(Array(itemCount).fill(1))

    expect(unref(totalPages)).toEqual(expected)
  })

  it('resets to the first page if a reset source changes', async () => {
    const filterTerm = ref('')
    const { currentPage } = getPagination([1, 2, 3, 4, 5, 6], 2, filterTerm)
    currentPage.value = 3

    filterTerm.value = 'foo'
    await nextTick()

    expect(unref(currentPage)).toBe(1)
  })

  it('keeps the current page if the items are replaced', async () => {
    const items = ref([1, 2, 3, 4, 5, 6])
    const { currentPage, paginatedItems } = getPagination(items, 2)
    currentPage.value = 3

    items.value = [7, 8, 9, 10, 11, 12]
    await nextTick()

    expect(unref(currentPage)).toBe(3)
    expect(unref(paginatedItems)).toEqual([11, 12])
  })

  it.each([
    { title: 'in place', removeItems: (items: any) => items.value.splice(6) },
    {
      title: 'by replacing the list',
      removeItems: (items: any) => (items.value = [1, 2, 3, 4, 5, 6])
    }
  ])('clamps the current page if items have been removed $title', ({ removeItems }) => {
    const items = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const { currentPage, paginatedItems } = getPagination(items, 2)
    currentPage.value = 5

    removeItems(items)

    expect(unref(currentPage)).toBe(3)
    expect(unref(paginatedItems)).toEqual([5, 6])
  })
})

function getPagination<T>(items: any, perPage?: number, resetOn?: any): LocalPaginationResult<T> {
  let pagination: LocalPaginationResult<T>
  getComposableWrapper(() => {
    pagination = useLocalPagination<T>({ items, perPage, resetOn })
  })

  return pagination
}
