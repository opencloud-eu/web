import { defaultComponentMocks, mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import TagsSelect from '../../../../src/components/SideBar/Details/TagsSelect.vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { ClientService, eventBus, useMessages, useResourcesStore } from '@opencloud-eu/web-pkg'
import { OcSelect } from '@opencloud-eu/design-system/components'
import { flushPromises } from '@vue/test-utils'

describe('Tag Select', () => {
  it('show tags input form if loaded successfully', () => {
    const resource = mock<Resource>({ tags: [] })
    const { wrapper } = createWrapper(resource)
    expect(wrapper.find('.tags-select').exists()).toBeTruthy()
  })

  it('shows the assigned tags in sorted order', () => {
    const { wrapper } = createWrapper(mock<Resource>({ tags: ['b', 'C', 'a'] }))
    expect(getLabels((wrapper.vm as any).selectedTags)).toEqual(['a', 'b', 'C'])
  })

  it('all available tags are selectable in sorted order', async () => {
    const tags = 'c,B,a'
    const resource = mock<Resource>({ tags: [] })
    const clientService = mockDeep<ClientService>()
    clientService.graphAuthenticated.tags.listTags.mockResolvedValueOnce(tags.split(','))

    const { wrapper } = createWrapper(resource, clientService)
    await flushPromises()
    expect(
      (wrapper.findComponent(OcSelect).findComponent({ ref: 'selectRef' }).props() as any).options
    ).toEqual([{ label: 'a' }, { label: 'B' }, { label: 'c' }])
  })

  test.each<[string[], { label: string }[], string[]]>([
    [['a', 'b'], [{ label: 'c' }], ['c']],
    [['a'], [{ label: 'a' }, { label: 'b, c' }], ['b', 'c']],
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
      const { wrapper } = createWrapper(resource, clientService)

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
      const { wrapper } = createWrapper(resource, clientService)

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

  it('removes a just added tag if the resource is a copy the store does not update', async () => {
    const clientService = mockDeep<ClientService>()
    clientService.graphAuthenticated.tags.assignTags.mockResolvedValue(undefined)
    const unassignTagsStub =
      clientService.graphAuthenticated.tags.unassignTags.mockResolvedValue(undefined)
    const { wrapper } = createWrapper(mock<Resource>({ id: '1', tags: [] }), clientService)
    await flushPromises()

    await (wrapper.vm as any).save([{ label: 'a' }])
    await (wrapper.vm as any).save([])
    expect(unassignTagsStub).toHaveBeenCalledWith(expect.objectContaining({ tags: ['a'] }))
  })

  it('keeps available tags sorted after a new tag was added and removed again', async () => {
    const clientService = mockDeep<ClientService>()
    clientService.graphAuthenticated.tags.assignTags.mockResolvedValue(undefined)
    clientService.graphAuthenticated.tags.unassignTags.mockResolvedValue(undefined)
    const { wrapper } = createWrapper(mock<Resource>({ id: '1', tags: [] }), clientService, [
      'beta',
      'gamma'
    ])
    await flushPromises()

    await (wrapper.vm as any).save([{ label: 'alpha' }])
    await (wrapper.vm as any).save([])
    expect(getLabels((wrapper.vm as any).availableTags)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('keeps the tags of a newer save when an older save finishes after it', async () => {
    const clientService = mockDeep<ClientService>()
    const { promise, resolve } = Promise.withResolvers<void>()
    clientService.graphAuthenticated.tags.assignTags
      .mockReturnValueOnce(promise)
      .mockResolvedValueOnce(undefined)
    const unassignTagsStub =
      clientService.graphAuthenticated.tags.unassignTags.mockResolvedValue(undefined)
    const { wrapper } = createWrapper(mock<Resource>({ tags: ['x'] }), clientService)
    await flushPromises()

    const olderSave = (wrapper.vm as any).save([{ label: 'x' }, { label: 'y' }])
    await (wrapper.vm as any).save([{ label: 'x' }, { label: 'y' }, { label: 'z' }])
    resolve()
    await olderSave

    await (wrapper.vm as any).save([{ label: 'x' }, { label: 'y' }])
    expect(unassignTagsStub).toHaveBeenCalledWith(expect.objectContaining({ tags: ['z'] }))
  })

  it('keeps the tags of a switched resource when a save of the previous one finishes', async () => {
    const clientService = mockDeep<ClientService>()
    const { promise, resolve } = Promise.withResolvers<void>()
    clientService.graphAuthenticated.tags.assignTags.mockReturnValueOnce(promise)
    const unassignTagsStub =
      clientService.graphAuthenticated.tags.unassignTags.mockResolvedValue(undefined)
    const { wrapper } = createWrapper(mock<Resource>({ id: '1', tags: ['a'] }), clientService)
    await flushPromises()

    const pendingSave = (wrapper.vm as any).save([{ label: 'a' }, { label: 'b' }])
    await wrapper.setProps({ resource: mock<Resource>({ id: '2', tags: ['x'] }) })
    resolve()
    await pendingSave

    await (wrapper.vm as any).save([])
    expect(unassignTagsStub).toHaveBeenCalledWith(expect.objectContaining({ tags: ['x'] }))
  })

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

  describe('reverts the selection on failure', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it('when adding a tag fails, so the next change does not send it again', async () => {
      const clientService = mockDeep<ClientService>()
      const assignTagsStub = clientService.graphAuthenticated.tags.assignTags
      assignTagsStub.mockRejectedValueOnce(new Error())
      const { wrapper } = createWrapper(mock<Resource>({ tags: ['a'] }), clientService, ['a'])
      await flushPromises()

      await (wrapper.vm as any).save([{ label: 'a' }, { label: 'failed' }])
      expect(getLabels((wrapper.vm as any).selectedTags)).toEqual(['a'])
      expect(getLabels((wrapper.vm as any).availableTags)).toEqual([])

      assignTagsStub.mockResolvedValueOnce(undefined)
      await (wrapper.vm as any).save([...(wrapper.vm as any).selectedTags, { label: 'ok' }])
      expect(assignTagsStub).toHaveBeenLastCalledWith(expect.objectContaining({ tags: ['ok'] }))
    })

    it('when removing a tag fails', async () => {
      const clientService = mockDeep<ClientService>()
      clientService.graphAuthenticated.tags.unassignTags.mockRejectedValueOnce(new Error())
      const { wrapper } = createWrapper(mock<Resource>({ tags: ['a', 'b'] }), clientService, [
        'a',
        'b',
        'c'
      ])
      await flushPromises()

      await (wrapper.vm as any).save([{ label: 'a' }])
      expect(getLabels((wrapper.vm as any).selectedTags)).toEqual(['a', 'b'])
      expect(getLabels((wrapper.vm as any).availableTags)).toEqual(['c'])
    })

    it('keeps the tags that were added when removing a tag fails afterwards', async () => {
      const clientService = mockDeep<ClientService>()
      clientService.graphAuthenticated.tags.assignTags.mockResolvedValueOnce(undefined)
      clientService.graphAuthenticated.tags.unassignTags.mockRejectedValueOnce(new Error())
      const resource = mock<Resource>({ id: '1', tags: ['a', 'b'] })
      const { wrapper } = createWrapper(resource, clientService, ['a', 'b'])
      await flushPromises()

      await (wrapper.vm as any).save([{ label: 'a' }, { label: 'c' }])
      expect(getLabels((wrapper.vm as any).selectedTags)).toEqual(['a', 'b', 'c'])
      expect(getLabels((wrapper.vm as any).availableTags)).toEqual([])
      const { updateResourceField } = useResourcesStore()
      expect(updateResourceField).toHaveBeenCalledWith({
        id: '1',
        field: 'tags',
        value: ['a', 'b', 'c']
      })
    })

    it('but not when the resource has been switched meanwhile', async () => {
      const clientService = mockDeep<ClientService>()
      const { promise, reject } = Promise.withResolvers<void>()
      clientService.graphAuthenticated.tags.assignTags.mockReturnValueOnce(promise)
      const { wrapper } = createWrapper(mock<Resource>({ id: '1', tags: ['a'] }), clientService)
      await flushPromises()

      const pendingSave = (wrapper.vm as any).save([{ label: 'a' }, { label: 'b' }])
      await wrapper.setProps({ resource: mock<Resource>({ id: '2', tags: ['x'] }) })
      reject(new Error())
      await pendingSave
      expect(getLabels((wrapper.vm as any).selectedTags)).toEqual(['x'])
    })

    it('but not when a newer change has been saved meanwhile', async () => {
      const clientService = mockDeep<ClientService>()
      const { promise, reject } = Promise.withResolvers<void>()
      clientService.graphAuthenticated.tags.assignTags
        .mockReturnValueOnce(promise)
        .mockResolvedValueOnce(undefined)
      const { wrapper } = createWrapper(mock<Resource>({ tags: ['x'] }), clientService)
      await flushPromises()

      const olderSave = (wrapper.vm as any).save([{ label: 'x' }, { label: 'y' }])
      await (wrapper.vm as any).save([{ label: 'x' }, { label: 'y' }, { label: 'z' }])
      reject(new Error())
      await olderSave
      expect(getLabels((wrapper.vm as any).selectedTags)).toEqual(['x', 'y', 'z'])
    })
  })

  it.each([
    { locked: false, deselectable: true },
    { locked: true, deselectable: false }
  ])(
    'renders deselect buttons only if tags are editable (%o)',
    async ({ locked, deselectable }) => {
      const { wrapper } = createWrapper(mock<Resource>({ tags: ['a', 'b'], locked }))
      await flushPromises()
      expect(wrapper.findAll('.tags-select-tag').length).toBe(2)
      expect(wrapper.findAll('.vs__deselect').length).toBe(deselectable ? 2 : 0)
    }
  )

  it('does not accept tags consisting of blanks only', () => {
    const { wrapper } = createWrapper(mock<Resource>({ tags: [] }))
    const option = (wrapper.vm as any).createOption(' ')
    expect(option.error).toBeDefined()
    expect(option.selectable).toBeFalsy()
  })

  it.each([
    { input: '   ', expected: [] },
    { input: 'new tag', expected: ['new tag'] }
  ])('pressing enter with input "$input" assigns $expected', async ({ input, expected }) => {
    const clientService = mockDeep<ClientService>()
    const assignTagsStub =
      clientService.graphAuthenticated.tags.assignTags.mockResolvedValue(undefined)
    const { wrapper } = createWrapper(mock<Resource>({ tags: [] }), clientService, [
      'Project Alpha'
    ])
    await flushPromises()

    const searchInput = wrapper.find('input')
    await searchInput.trigger('focus')
    await searchInput.setValue(input)
    await searchInput.trigger('keydown', { keyCode: 13 })
    await flushPromises()

    if (expected.length) {
      expect(assignTagsStub).toHaveBeenCalledWith(expect.objectContaining({ tags: expected }))
    } else {
      expect(assignTagsStub).not.toHaveBeenCalled()
    }
  })
})

function createWrapper(
  resource: Resource,
  clientService = mockDeep<ClientService>(),
  availableTags: string[] = []
) {
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }
  mocks.$clientService.graphAuthenticated.tags.listTags.mockResolvedValue(availableTags)
  return {
    wrapper: mount(TagsSelect, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: { ...mocks },
        stubs: { CompareSaveDialog: true }
      },
      props: {
        resource
      }
    })
  }
}

function getLabels(options: { label: string }[]) {
  return options.map(({ label }) => label)
}
