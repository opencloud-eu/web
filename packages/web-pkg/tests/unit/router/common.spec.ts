import { mock } from 'vitest-mock-extended'
import { createMemoryHistory, createRouter } from 'vue-router'
import { buildRoutes } from '../../../src/router/common'
import { RouteComponents } from '../../../src/router/router'

describe('common routes', () => {
  it('redirects "/search" to the search results and keeps the query', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(mock<RouteComponents>({ App: {}, SearchResults: {}, Favorites: {} }))
    })

    await router.push('/search?term=foo&provider=files.sdk')

    expect(router.currentRoute.value.name).toBe('files-common-search')
    expect(router.currentRoute.value.path).toBe('/search/list')
    expect(router.currentRoute.value.query).toEqual({ term: 'foo', provider: 'files.sdk' })
  })
})
