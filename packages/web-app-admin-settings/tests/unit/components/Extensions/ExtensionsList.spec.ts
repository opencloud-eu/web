import ExtensionsList from '../../../../src/components/Extensions/ExtensionsList.vue'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { OcTable } from '@opencloud-eu/design-system/components'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { ExtensionInfo } from '../../../../src/components/Extensions/types'

const extensions: ExtensionInfo[] = [
  { name: 'Calendar', version: '1.0.0', status: 'active', loaded: true },
  { name: 'Files', version: '2.0.0', status: 'failed', loaded: false }
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
      extensions: [{ name: 'Calendar', version: '1.0.0', status: 'active', loaded: true }],
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
        { name: 'Zulu', version: '1.0.0', status: 'active', loaded: true },
        { name: 'Alpha', version: '2.0.0', status: 'active', loaded: true }
      ],
      query: { 'sort-by': 'name', 'sort-dir': sortDir }
    })
    expect(getTableData(wrapper).map(({ name }) => name)).toEqual(expected)
  })

  it.each([
    { sortDir: SortDir.Asc, expected: ['Beta', 'Gamma', 'Alpha'] },
    { sortDir: SortDir.Desc, expected: ['Alpha', 'Gamma', 'Beta'] }
  ])('sorts by status from the route query ($sortDir)', ({ sortDir, expected }) => {
    const { wrapper } = getWrapper({
      extensions: [
        { name: 'Alpha', version: '1.0.0', status: 'failed', loaded: false },
        { name: 'Beta', version: '1.0.0', status: 'active', loaded: true },
        { name: 'Gamma', version: '1.0.0', status: 'incompatible', loaded: true }
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

  describe('status', () => {
    const ocTableStub = {
      props: ['data'],
      template: `
        <div class="oc-table-stub">
          <div v-for="item in data" :key="item.name" class="row">
            <slot name="minOpenCloud" :item="item" />
            <slot name="maxOpenCloud" :item="item" />
            <slot name="status" :item="item" />
          </div>
        </div>
      `
    }

    it('shows the OpenCloud version constraints', () => {
      const { wrapper } = getWrapper({
        extensions: [
          {
            name: 'Draw.io',
            version: '2.1.0',
            minOpenCloud: '6.0.0',
            maxOpenCloud: '7.5.0',
            status: 'active',
            loaded: true
          },
          { name: 'Zulu', version: '1.0.0', status: 'active', loaded: true }
        ],
        stubs: { OcTable: ocTableStub }
      })
      const rows = wrapper.findAll('.row')
      expect(rows[0].text()).toContain('6.0.0')
      expect(rows[0].text()).toContain('7.5.0')
      expect(rows[1].findAll('span').map((s) => s.text())).toEqual(['—', '—'])
    })

    it('shows loading placeholders instead of the compatibility info while loading', () => {
      const { wrapper } = getWrapper({
        extensions: [
          {
            name: 'Draw.io',
            version: '2.1.0',
            minOpenCloud: '6.0.0',
            maxOpenCloud: '7.5.0',
            status: 'incompatible',
            loaded: true
          }
        ],
        loadingCompatibility: true,
        stubs: { OcTable: ocTableStub }
      })
      const row = wrapper.find('.row')
      expect(row.findAll('.compatibility-loading')).toHaveLength(3)
      expect(row.text()).not.toContain('6.0.0')
      expect(row.find('oc-tag-stub').exists()).toBeFalsy()
      expect(wrapper.findComponent({ name: 'OcContextualHelper' }).exists()).toBeFalsy()
    })

    it('shows a contextual helper with the version constraints for incompatible apps', () => {
      const { wrapper } = getWrapper({
        extensions: [
          {
            name: 'Draw.io',
            version: '2.1.0',
            minOpenCloud: '6.0.0',
            maxOpenCloud: '7.5.0',
            status: 'incompatible',
            loaded: true
          }
        ],
        serverVersion: '8.0.0',
        stubs: { OcTable: ocTableStub }
      })
      const helper = wrapper.findComponent({ name: 'OcContextualHelper' })
      expect(helper.exists()).toBeTruthy()
      expect(helper.props('text')).toBe(
        'This app version requires an OpenCloud version between 6.0.0 and 7.5.0. The current OpenCloud version is 8.0.0.'
      )
    })

    it('mentions the failed loading in the contextual helper of incompatible apps', () => {
      const { wrapper } = getWrapper({
        extensions: [
          {
            name: 'Draw.io',
            version: '2.1.0',
            minOpenCloud: '6.0.0',
            maxOpenCloud: '7.5.0',
            status: 'incompatible',
            loaded: false
          }
        ],
        serverVersion: '8.0.0',
        stubs: { OcTable: ocTableStub }
      })
      expect(wrapper.findComponent({ name: 'OcContextualHelper' }).props('text')).toBe(
        'This app version requires an OpenCloud version between 6.0.0 and 7.5.0. The current OpenCloud version is 8.0.0. The app could not be loaded, most likely because of this.'
      )
    })

    it.each([
      { status: 'active' as const, loaded: true },
      { status: 'failed' as const, loaded: false }
    ])('does not show a contextual helper for $status apps', ({ status, loaded }) => {
      const { wrapper } = getWrapper({
        extensions: [{ name: 'Draw.io', version: '2.1.0', status, loaded }],
        stubs: { OcTable: ocTableStub }
      })
      expect(wrapper.findComponent({ name: 'OcContextualHelper' }).exists()).toBeFalsy()
    })
  })

  describe('icon', () => {
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

    it('renders the app icon with the line variant by default', () => {
      const { wrapper } = getWrapper({
        extensions: [{ name: 'Draw.io', icon: 'grid', status: 'active', loaded: true }],
        stubs: { OcTable: ocTableStub }
      })
      const icon = wrapper.findComponent({ name: 'OcIcon' })
      expect(icon.props('icon')).toBe('grid')
      expect(icon.props('fillType')).toBe('line')
    })

    it('renders the app icon with the fill type of the app', () => {
      const { wrapper } = getWrapper({
        extensions: [
          {
            name: 'Presentation Viewer',
            icon: { name: 'resource-type-presentation', fillType: 'fill' },
            status: 'active',
            loaded: true
          }
        ],
        stubs: { OcTable: ocTableStub }
      })
      const icon = wrapper.findComponent({ name: 'OcIcon' })
      expect(icon.props('icon')).toEqual({ name: 'resource-type-presentation', fillType: 'fill' })
    })

    it('falls back to the puzzle icon if the app has no icon', () => {
      const { wrapper } = getWrapper({
        extensions: [{ name: 'draw-io', status: 'failed', loaded: false }],
        stubs: { OcTable: ocTableStub }
      })
      const icon = wrapper.findComponent({ name: 'OcIcon' })
      expect(icon.props('icon')).toBe('puzzle')
      expect(icon.props('fillType')).toBe('line')
    })

    it('falls back to the puzzle icon if the app icon cannot be loaded', async () => {
      const { wrapper } = getWrapper({
        extensions: [
          {
            name: 'Excalidraw',
            icon: 'resource-type-graphic',
            status: 'active',
            loaded: true
          }
        ],
        stubs: { OcTable: ocTableStub }
      })
      await wrapper.findComponent({ name: 'OcIcon' }).vm.$emit('error')
      const icon = wrapper.findComponent({ name: 'OcIcon' })
      expect(icon.props('icon')).toBe('puzzle')
      expect(icon.props('fillType')).toBe('line')
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
})

function getTableData(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(OcTable).props('data') as { name: string }[]
}

function getWrapper({
  extensions: extensionData = extensions,
  filterTerm = '',
  serverVersion = '',
  loadingCompatibility = false,
  stubs = {},
  query = {}
}: {
  extensions?: ExtensionInfo[]
  filterTerm?: string
  serverVersion?: string
  loadingCompatibility?: boolean
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
        filterTerm,
        serverVersion,
        loadingCompatibility
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: {
          OcIcon: true,
          OcTag: true,
          OcContextualHelper: true,
          OcTable: true,
          NoContentMessage: true,
          ...stubs
        }
      }
    })
  }
}
