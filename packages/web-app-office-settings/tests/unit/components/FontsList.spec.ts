import FontsList from '../../../src/components/FontsList.vue'
import { OcTable } from '@opencloud-eu/design-system/components'
import { FieldType, SortDir } from '@opencloud-eu/design-system/helpers'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { Font } from '../../../src/types'

const font = (family: string, extra: Partial<Font> = {}) =>
  ({ file: `${family}.ttf`, family, ...extra }) as Font

const fonts = [font('Roboto', { version: '1.0' }), font('Lato')]

describe('FontsList', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('renders the table when the filter matches', () => {
    const { wrapper } = getWrapper({ filterTerm: 'rob' })
    expect((wrapper.vm as any).filteredFonts.map((f: Font) => f.family)).toEqual(['Roboto'])
    expect(wrapper.find('oc-table-stub').exists()).toBeTruthy()
  })

  it('renders a no-content message when the filter has no matches', () => {
    const { wrapper } = getWrapper({ filterTerm: 'unknown' })
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
    expect(wrapper.find('oc-table-stub').exists()).toBeFalsy()
  })

  it('filters by name only', () => {
    const { wrapper } = getWrapper({ filterTerm: '1.0' })
    expect((wrapper.vm as any).filteredFonts).toHaveLength(0)
  })

  it.each([
    { sortDir: SortDir.Asc, expected: ['Lato', 'Roboto'] },
    { sortDir: SortDir.Desc, expected: ['Roboto', 'Lato'] }
  ])('sorts by the stored name sorting ($sortDir)', ({ sortDir, expected }) => {
    window.localStorage.setItem('oc-options_route_sort-by', 'family')
    window.localStorage.setItem('oc-options_route_sort-dir', sortDir)
    const { wrapper } = getWrapper()
    expect((wrapper.vm as any).items.map((f: Font) => f.family)).toEqual(expected)
  })

  it('makes exactly the columns of the sort fields sortable, with their direction', () => {
    const { wrapper } = getWrapper()
    const sortableColumns = wrapper
      .findComponent(OcTable)
      .props('fields')
      .filter(({ sortable }: FieldType) => sortable)
      .map(({ name, sortDir }: FieldType) => `${name} ${sortDir}`)
    expect(sortableColumns).toEqual(['family asc'])
  })

  it('highlights the matching part of font names and emits delete', async () => {
    const ocTableStub = {
      props: ['data'],
      template: `
        <div>
          <div v-for="item in data" :key="item.file">
            <slot name="family" :item="item" />
            <slot name="actions" :item="item" />
          </div>
        </div>
      `
    }
    const { wrapper } = getWrapper({ filterTerm: 'rob', stubs: { OcTable: ocTableStub } })

    const highlight = wrapper.find('.oc-filter-highlight-match')
    expect(highlight.text().toLowerCase()).toBe('rob')

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('delete')).toEqual([[fonts[0]]])
  })
})

function getWrapper({
  filterTerm = '',
  stubs = {}
}: {
  filterTerm?: string
  stubs?: Record<string, any>
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: { name: 'route', path: '/', query: {}, meta: {} } as RouteLocationNormalizedLoaded
  })
  return {
    mocks,
    wrapper: mount(FontsList, {
      props: { fonts, previewUrls: {}, filterTerm },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: { OcIcon: true, OcTable: true, NoContentMessage: true, ...stubs }
      }
    })
  }
}
