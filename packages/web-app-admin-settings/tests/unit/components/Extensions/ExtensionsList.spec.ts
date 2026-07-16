import ExtensionsList from '../../../../src/components/Extensions/ExtensionsList.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

const extensions = [
  { name: 'Calendar', version: '1.0.0', loaded: true },
  { name: 'Files', version: '2.0.0', loaded: false }
]

describe('ExtensionsList', () => {
  it('renders table data when filter matches results', () => {
    const { wrapper } = getWrapper({ filterTerm: 'fi' })
    expect((wrapper.vm as any).filteredExtensions).toHaveLength(1)
    expect((wrapper.vm as any).filteredExtensions[0].name).toBe('Files')
    expect(wrapper.find('oc-table-stub').exists()).toBeTruthy()
  })

  it('renders no-content message when filter has no matches', () => {
    const { wrapper } = getWrapper({ filterTerm: 'unknown' })
    expect((wrapper.vm as any).filteredExtensions).toHaveLength(0)
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
  })

  it('filters by name only', () => {
    const { wrapper } = getWrapper({
      extensions: [{ name: 'Calendar', version: '1.0.0', loaded: true }],
      filterTerm: '1.0.0'
    })
    expect((wrapper.vm as any).filteredExtensions).toHaveLength(0)
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
    expect(wrapper.find('oc-table-stub').exists()).toBeFalsy()
  })
})

function getWrapper({
  extensions: extensionData = extensions,
  filterTerm = ''
}: {
  extensions?: { name: string; version?: string; loaded: boolean }[]
  filterTerm?: string
} = {}) {
  return {
    wrapper: mount(ExtensionsList, {
      props: {
        extensions: extensionData,
        filterTerm
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: {
          OcIcon: true,
          OcTag: true,
          OcTable: true,
          NoContentMessage: true
        }
      }
    })
  }
}
