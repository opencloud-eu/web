import ExtensionsList from '../../../../src/components/Extensions/ExtensionsList.vue'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { OcIcon, OcTable } from '@opencloud-eu/design-system/components'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { RouteLocationNormalizedLoaded } from 'vue-router'

const extensions = [
  { name: 'Calendar', version: '1.0.0', loaded: true },
  { name: 'Files', version: '2.0.0', loaded: false }
]

describe('ExtensionsList', () => {
  it('renders table data when filter matches results', () => {
    const { wrapper } = getWrapper({ filterTerm: 'fi' })
    expect(getTableData(wrapper).map(({ name }) => name)).toEqual(['Files'])
  })

  it('renders no-content message when filter has no matches', () => {
    const { wrapper } = getWrapper({ filterTerm: 'unknown' })
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
    expect(wrapper.findComponent(OcTable).exists()).toBeFalsy()
  })

  it('filters by name only', () => {
    const { wrapper } = getWrapper({
      extensions: [{ name: 'Calendar', version: '1.0.0', loaded: true }],
      filterTerm: '1.0.0'
    })
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
    expect(wrapper.findComponent(OcTable).exists()).toBeFalsy()
  })

  it.each([
    { sortDir: SortDir.Asc, expected: ['Alpha', 'Zulu'] },
    { sortDir: SortDir.Desc, expected: ['Zulu', 'Alpha'] }
  ])('sorts by name from the route query ($sortDir)', ({ sortDir, expected }) => {
    const { wrapper } = getWrapper({
      extensions: [
        { name: 'Zulu', version: '1.0.0', loaded: true },
        { name: 'Alpha', version: '2.0.0', loaded: true }
      ],
      query: { 'sort-by': 'name', 'sort-dir': sortDir }
    })
    expect(getTableData(wrapper).map(({ name }) => name)).toEqual(expected)
  })

  it.each([
    { sortDir: SortDir.Asc, expected: ['Beta', 'Alpha'] },
    { sortDir: SortDir.Desc, expected: ['Alpha', 'Beta'] }
  ])('sorts by status from the route query ($sortDir)', ({ sortDir, expected }) => {
    const { wrapper } = getWrapper({
      extensions: [
        { name: 'Alpha', version: '1.0.0', loaded: false },
        { name: 'Beta', version: '1.0.0', loaded: true }
      ],
      query: { 'sort-by': 'status', 'sort-dir': sortDir }
    })
    expect(getTableData(wrapper).map(({ name }) => name)).toEqual(expected)
  })

  it('writes the sort parameters to the route query when the table emits "sort"', () => {
    const { wrapper, mocks } = getWrapper()
    wrapper.findComponent(OcTable).vm.$emit('sort', { sortBy: 'status', sortDir: SortDir.Desc })
    expect(mocks.$router.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({ 'sort-by': 'status', 'sort-dir': SortDir.Desc })
    })
  })

  it('highlights the matching part of app names', () => {
    const ocTableStub = {
      props: ['data'],
      template: `
        <div class="oc-table-stub">
          <div v-for="item in data" :key="item.name">
            <slot name="name" :item="item" />
          </div>
        </div>
      `
    }

    const { wrapper } = getWrapper({
      filterTerm: 'fi',
      stubs: {
        OcTable: ocTableStub
      }
    })

    const highlight = wrapper.find('.oc-filter-highlight-match')
    expect(highlight.exists()).toBeTruthy()
    expect(highlight.text().toLowerCase()).toBe('fi')
  })

  it.each([
    { iconFillType: undefined, expected: 'line' },
    { iconFillType: 'fill' as const, expected: 'fill' }
  ])('renders the app icon with the fill type "$expected"', ({ iconFillType, expected }) => {
    const ocTableStub = {
      props: ['data'],
      template: `
        <div class="oc-table-stub">
          <div v-for="item in data" :key="item.name">
            <slot name="name" :item="item" />
          </div>
        </div>
      `
    }

    const { wrapper } = getWrapper({
      extensions: [{ name: 'Calendar', icon: 'calendar', iconFillType, loaded: true }],
      stubs: {
        OcTable: ocTableStub
      }
    })

    expect(wrapper.findComponent(OcIcon).props('fillType')).toBe(expected)
  })
})

function getTableData(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(OcTable).props('data') as { name: string }[]
}

function getWrapper({
  extensions: extensionData = extensions,
  filterTerm = '',
  stubs = {},
  query = {}
}: {
  extensions?: {
    name: string
    icon?: string
    iconFillType?: 'fill' | 'line'
    version?: string
    loaded: boolean
  }[]
  filterTerm?: string
  stubs?: Record<string, any>
  query?: Record<string, string>
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: { name: 'route', path: '/', query, meta: {} } as RouteLocationNormalizedLoaded
  })
  return {
    mocks,
    wrapper: mount(ExtensionsList, {
      props: {
        extensions: extensionData,
        filterTerm
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: {
          OcIcon: true,
          OcTag: true,
          OcTable: true,
          NoContentMessage: true,
          ...stubs
        }
      }
    })
  }
}
