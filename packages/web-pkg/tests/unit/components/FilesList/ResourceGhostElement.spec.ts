import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import ResourceGhostElement from '../../../../src/components/FilesList/ResourceGhostElement.vue'

const selectors = {
  name: '.resource-ghost-element-name',
  badge: '.badge'
}

describe('ResourceGhostElement', () => {
  it('shows the name of the first dragged resource', () => {
    const wrapper = getWrapper([
      getResource({ id: '1', name: 'Quarterly report with a very long name.pdf' }),
      getResource({ id: '2', name: 'Other folder', type: 'folder' })
    ])
    expect(wrapper.find(selectors.name).text()).toBe('Quarterly report with a very long name.pdf')
  })
  it.each([
    { name: 'report.pdf', type: 'file', extension: 'pdf', shown: true, expected: 'report.pdf' },
    { name: 'report.pdf', type: 'file', extension: 'pdf', shown: false, expected: 'report' },
    { name: '.bashrc', type: 'file', extension: 'bashrc', shown: false, expected: '.bashrc' },
    { name: 'photos.2024', type: 'folder', extension: '', shown: false, expected: 'photos.2024' }
  ])(
    'shows "$expected" for "$name" when file extensions are shown: $shown',
    ({ name, type, extension, shown, expected }) => {
      const wrapper = getWrapper([getResource({ id: '1', name, type, extension })], shown)
      expect(wrapper.find(selectors.name).text()).toBe(expected)
    }
  )
  it('shows the number of dragged resources', () => {
    const wrapper = getWrapper([
      getResource({ id: '1', name: 'a.txt' }),
      getResource({ id: '2', name: 'b.txt' }),
      getResource({ id: '3', name: 'c.txt' })
    ])
    expect(wrapper.find(selectors.badge).text()).toBe('3')
  })
})

function getResource({
  id,
  name,
  type = 'file',
  extension = ''
}: {
  id: string
  name: string
  type?: string
  extension?: string
}) {
  return mock<Resource>({ id, name, type, isFolder: type === 'folder', extension })
}

function getWrapper(previewItems: Resource[], areFileExtensionsShown = true) {
  return mount(ResourceGhostElement, {
    props: { previewItems },
    global: {
      plugins: [...defaultPlugins({ piniaOptions: { resourcesStore: { areFileExtensionsShown } } })]
    }
  })
}
