import { useRouteQueryFilterTerm } from '../../../../src/composables'
import { Ref, unref } from 'vue'
import { getComposableWrapper, createRouter } from '@opencloud-eu/web-test-helpers'

async function setup(query: Record<string, string> = {}) {
  const router = createRouter({ routes: [{ path: '/', redirect: null }] })
  await router.push({ path: '/', query })
  await router.isReady()

  let filterTerm: Ref<string>
  const mocks = { $router: router }
  getComposableWrapper(
    () => {
      filterTerm = useRouteQueryFilterTerm()
    },
    { mocks, provide: mocks }
  )

  return { router, filterTerm }
}

describe('useRouteQueryFilterTerm', () => {
  it('defaults to an empty string', async () => {
    const { filterTerm } = await setup()
    expect(unref(filterTerm)).toBe('')
  })

  it('reads the term from the route query', async () => {
    const { filterTerm } = await setup({ q_search_term: 'foo' })
    expect(unref(filterTerm)).toBe('foo')
  })

  it('writes the term to the route query', async () => {
    const { router, filterTerm } = await setup({ other: 'bar' })
    filterTerm.value = 'foo'
    await vi.waitFor(() =>
      expect(unref(router.currentRoute).query).toEqual({ other: 'bar', q_search_term: 'foo' })
    )
  })

  it('removes the query param when the term is cleared', async () => {
    const { router, filterTerm } = await setup({ q_search_term: 'foo' })
    filterTerm.value = ''
    await vi.waitFor(() =>
      expect(unref(router.currentRoute).query).not.toHaveProperty('q_search_term')
    )
  })
})
