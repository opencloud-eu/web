import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useAppSort } from '../../../src/composables'
import { App, AppVersion } from '../../../src/types'

function getApp(name: string, releaseDates: string[]): App {
  const versions = releaseDates.map(
    (releaseDate, index) => ({ version: `1.${index}.0`, url: '', releaseDate }) as AppVersion
  )
  return { ...mock<App>(), name, versions }
}

const apps = [
  getApp('Calculator', ['2026-09-01', '2026-01-10']),
  getApp('Draw.io', ['2026-05-01']),
  getApp('Arcade', [undefined]),
  getApp('BPMN', ['2026-03-01'])
]

describe('useAppSort', () => {
  it('sorts by name by default', () => {
    const { sortedApps } = getWrapper()
    expect(sortedApps.value.map(({ name }) => name)).toEqual([
      'Arcade',
      'BPMN',
      'Calculator',
      'Draw.io'
    ])
  })
  it.each([
    ['desc', ['Draw.io', 'BPMN', 'Calculator', 'Arcade']],
    ['asc', ['Arcade', 'Calculator', 'BPMN', 'Draw.io']]
  ])(
    'sorts by the first release date (%s), apps without one count as oldest',
    (sortDir, expected) => {
      const { sortedApps } = getWrapper({ 'sort-by': 'release', 'sort-dir': sortDir })
      expect(sortedApps.value.map(({ name }) => name)).toEqual(expected)
    }
  )
})

function getWrapper(query: Record<string, string> = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: { query, path: '/', name: 'app-store-list', meta: {} } as unknown as RouteLocation
  })
  let result: ReturnType<typeof useAppSort>
  getComposableWrapper(
    () => {
      result = useAppSort(ref(apps))
    },
    { mocks, provide: mocks }
  )
  return result
}
