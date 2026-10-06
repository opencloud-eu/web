import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { useRouteQuery, useRouter } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useAppFilter } from '../../../src/composables'
import { App } from '../../../src/types'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteQuery: vi.fn(),
  useRouter: vi.fn()
}))

const apps: App[] = [
  { ...mock<App>(), name: 'Calculator', subtitle: 'Search provider', tags: ['search'] },
  { ...mock<App>(), name: 'Draw.io', subtitle: 'Diagrams', tags: ['viewer', 'editor'] },
  { ...mock<App>(), name: 'Presentation Viewer', subtitle: 'Slides', tags: ['markdown'] }
]

describe('useAppFilter', () => {
  it('returns all apps if no filter term is set', () => {
    const { filteredApps } = getWrapper('')
    expect(filteredApps.value).toEqual(apps)
  })
  it('filters apps by the filter term', () => {
    const { filteredApps } = getWrapper('diagrams')
    expect(filteredApps.value.map((app) => app.name)).toEqual(['Draw.io'])
  })
  it('filters apps by exact tag match only', () => {
    const { filteredApps } = getWrapper('', {}, 'Viewer')
    expect(filteredApps.value.map((app) => app.name)).toEqual(['Draw.io'])
  })
  it('combines the filter term and the tag', () => {
    const { searchedApps, filteredApps } = getWrapper('calculator', {}, 'viewer')
    expect(searchedApps.value.map((app) => app.name)).toEqual(['Calculator'])
    expect(filteredApps.value).toEqual([])
  })
  it('keeps other query params when setting the filter term', () => {
    const { setFilterTerm, mocks } = getWrapper('', { 'view-mode': 'list', filter: 'old' })
    setFilterTerm(' new ')
    expect(mocks.$router.replace).toHaveBeenCalledWith({
      query: { 'view-mode': 'list', filter: 'new' }
    })
  })
  it('removes the filter query param when setting an empty term', () => {
    const { setFilterTerm, mocks } = getWrapper('', { 'view-mode': 'list', filter: 'old' })
    setFilterTerm('')
    expect(mocks.$router.replace).toHaveBeenCalledWith({ query: { 'view-mode': 'list' } })
  })
  it('keeps the filter term when setting the tag', () => {
    const { setActiveTag, mocks } = getWrapper('', { filter: 'draw', q_tag: 'old' })
    setActiveTag('viewer')
    expect(mocks.$router.replace).toHaveBeenCalledWith({
      query: { filter: 'draw', q_tag: 'viewer' }
    })
  })
})

function getWrapper(filterTerm: string, query: Record<string, string> = {}, tag = '') {
  const mocks = defaultComponentMocks({
    currentRoute: { query, path: '/', meta: {} } as unknown as RouteLocation
  })
  vi.mocked(useRouter).mockReturnValue(mocks.$router)
  vi.mocked(useRouteQuery).mockImplementation((name) => ref(name === 'q_tag' ? tag : filterTerm))

  let result: ReturnType<typeof useAppFilter>
  getComposableWrapper(() => {
    result = useAppFilter(ref(apps))
  })
  return { ...result, mocks }
}
