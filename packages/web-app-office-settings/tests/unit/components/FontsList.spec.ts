import FontsList from '../../../src/components/FontsList.vue'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { Font } from '../../../src/types'

const font = (family: string, extra: Partial<Font> = {}) =>
  ({ file: `${family}.ttf`, family, ...extra }) as Font

const fonts = [font('Roboto', { version: '1.0' }), font('Lato')]

describe('FontsList', () => {
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
  ])('sorts by name from the route query ($sortDir)', ({ sortDir, expected }) => {
    const { wrapper } = getWrapper({ query: { 'sort-by': 'family', 'sort-dir': sortDir } })
    expect((wrapper.vm as any).items.map((f: Font) => f.family)).toEqual(expected)
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
  stubs = {},
  query = {}
}: {
  filterTerm?: string
  stubs?: Record<string, any>
  query?: Record<string, string>
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: { name: 'route', path: '/', query, meta: {} } as RouteLocationNormalizedLoaded
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
