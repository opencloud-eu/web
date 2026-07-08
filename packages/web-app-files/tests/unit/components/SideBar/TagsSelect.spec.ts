import { defaultComponentMocks, mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import TagsSelect from '../../../../src/components/SideBar/Details/TagsSelect.vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { ClientService, eventBus, useMessages } from '@opencloud-eu/web-pkg'
import { OcSelect } from '@opencloud-eu/design-system/components'
import { flushPromises } from '@vue/test-utils'

describe('Tag Select', () => {
  it('show tags input form if loaded successfully', () => {
    const resource = mock<Resource>({ tags: [] })
    const { wrapper } = createWrapper(resource)
    expect(wrapper.find('.tags-select').exists()).toBeTruthy()
  })

  it('all available tags are selectable', async () => {
    const tags = 'a,b,c'
    const resource = mock<Resource>({ tags: [] })
    const clientService = mockDeep<ClientService>()
    clientService.graphAuthenticated.tags.listTags.mockResolvedValueOnce(tags.split(','))

    const { wrapper } = createWrapper(resource, clientService)
    await flushPromises()
    expect(
      (wrapper.findComponent<typeof OcSelect>('vue-select-stub').props() as any).options
    ).toEqual([{ label: 'a' }, { label: 'b' }, { label: 'c' }])
  })

  describe('save method', () => {
    it('publishes the "save"-event', async () => {
      const eventStub = vi.spyOn(eventBus, 'publish')
      const tags = ['a', 'b']
      const resource = mock<Resource>({ tags: tags })
      const { wrapper } = createWrapper(resource, mockDeep<ClientService>(), false)
      await (wrapper.vm as any).save(tags)
      expect(eventStub).toHaveBeenCalled()
    })
  })

  test.each<[string[], { label: string }[], string[]]>([
    [['a', 'b'], [{ label: 'c' }], ['c']],
    [['a', 'b'], [{ label: 'a' }, { label: 'b' }, { label: 'c' }], ['c']],
    [
      ['a', 'b'],
      [{ label: 'a' }, { label: 'b' }, { label: 'c' }, { label: 'd' }],
      ['c', 'd']
    ]
  ])(
    'resource with the initial tags %s and selected tags %s adds %s',
    async (resourceTags, selectedTags, expected) => {
      const resource = mock<Resource>({ tags: resourceTags })
      const clientService = mockDeep<ClientService>()
      const stub = clientService.graphAuthenticated.tags.assignTags.mockResolvedValue(undefined)
      const { wrapper } = createWrapper(resource, clientService, false)

      ;(wrapper.vm as any).selectedTags = selectedTags

      await (wrapper.vm as any).save(selectedTags)

      if (expected.length) {
        expect(stub).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: expected
          })
        )
      } else {
        expect(stub).not.toHaveBeenCalled()
      }
    }
  )

  test.each<[string[], { label: string }[], string[]]>([
    [['a', 'b'], [{ label: 'a' }], ['b']],
    [['a', 'b'], [{ label: 'a' }, { label: 'b' }, { label: 'c' }], []],
    [['a', 'b'], [], ['a', 'b']]
  ])(
    'resource with the initial tags %s and selected tags %s removes %s',
    async (resourceTags, selectedTags, expected) => {
      const resource = mock<Resource>({ tags: resourceTags })
      const clientService = mockDeep<ClientService>()
      const stub = clientService.graphAuthenticated.tags.unassignTags.mockResolvedValue(undefined)
      const { wrapper } = createWrapper(resource, clientService, false)

      ;(wrapper.vm as any).selectedTags = selectedTags

      await (wrapper.vm as any).save(selectedTags)

      if (expected.length) {
        expect(stub).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: expected
          })
        )
      } else {
        expect(stub).not.toHaveBeenCalled()
      }
    }
  )

  it('shows message on failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const clientService = mockDeep<ClientService>()
    const assignTagsStub = clientService.graphAuthenticated.tags.assignTags.mockRejectedValue(
      new Error()
    )
    const resource = mock<Resource>({ tags: ['a'] })
    const eventStub = vi.spyOn(eventBus, 'publish')
    const { wrapper } = createWrapper(resource, clientService)
    ;(wrapper.vm as any).selectedTags.push({ label: 'b' })
    await (wrapper.vm as any).save((wrapper.vm as any).selectedTags)
    expect(assignTagsStub).toHaveBeenCalled()
    expect(eventStub).not.toHaveBeenCalled()
    const { showErrorMessage } = useMessages()
    expect(showErrorMessage).toHaveBeenCalledTimes(1)
  })

  it('does not accept tags consisting of blanks only', () => {
    const { wrapper } = createWrapper(mock<Resource>({ tags: [] }))
    const option = (wrapper.vm as any).createOption(' ')
    expect(option.error).toBeDefined()
    expect(option.selectable).toBeFalsy()
  })
})

function createWrapper(
  resource: Resource,
  clientService = mockDeep<ClientService>(),
  stubVueSelect = true
) {
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }
  mocks.$clientService.graphAuthenticated.tags.listTags.mockResolvedValue([])
  return {
    wrapper: mount(TagsSelect, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: { ...mocks },
        stubs: { VueSelect: stubVueSelect, CompareSaveDialog: true }
      },
      props: {
        resource
      }
    })
  }
}
