import AnnouncementSection from '../../../../src/components/General/AnnouncementSection.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mockDeep } from 'vitest-mock-extended'
import { ClientService, useConfigStore, useMessages } from '@opencloud-eu/web-pkg'

// avoid spinning up a real TipTap editor; getContent/setContent are backed by a shared value so
// tests can drive the editor content that the save/preview paths read
const { editorState } = vi.hoisted(() => ({ editorState: { content: '' } }))
vi.mock('@opencloud-eu/web-pkg/editor', () => ({
  useTextEditor: vi.fn(() => ({
    editor: { value: null },
    setContent: vi.fn((content: string) => {
      editorState.content = content
    }),
    getContent: vi.fn(() => editorState.content)
  })),
  TextEditorProvider: { name: 'TextEditorProvider', template: '<div><slot /></div>' },
  TextEditorContent: { name: 'TextEditorContent', template: '<div />' },
  TextEditorToolbar: { name: 'TextEditorToolbar', template: '<div />' }
}))

type StoredAnnouncement = { enabled: boolean; bannerText: string; infoText: string }

// script-setup bindings accessed for testing; not part of the component's public type
type AnnouncementVm = {
  enabled: boolean
  bannerText: string
  infoText: string
  loadTask: { last: Promise<unknown> }
  saveTask: { perform: () => void; last: Promise<unknown> }
  toggleTask: { last: Promise<unknown> }
  onToggleEnabled: (value: boolean) => void
  preview: () => void
}

describe('AnnouncementSection', () => {
  beforeEach(() => {
    editorState.content = ''
  })

  it('loads the stored announcement on mount and mirrors the live banner when enabled', async () => {
    const { vm } = getWrapper({ enabled: true, bannerText: 'Hi', infoText: 'Details' })
    await vm.loadTask.last

    expect(vm.enabled).toBe(true)
    expect(vm.bannerText).toBe('Hi')
    expect(useConfigStore().options.announcement).toEqual({ bannerText: 'Hi', infoText: 'Details' })
  })

  it('saves the text via PUT while keeping the current (disabled) state hidden', async () => {
    const { vm, clientService } = getWrapper()
    await vm.loadTask.last

    vm.bannerText = 'Maintenance'
    editorState.content = 'Details'
    vm.saveTask.perform()
    await vm.saveTask.last

    expect(clientService.httpAuthenticated.put).toHaveBeenCalledWith('announcement', {
      enabled: false,
      bannerText: 'Maintenance',
      infoText: 'Details'
    })
    // still disabled, so not exposed in the live banner
    expect(useConfigStore().options.announcement).toBeUndefined()
    expect(useMessages().showMessage).toHaveBeenCalled()
  })

  it('removes the announcement when saving with an empty banner text', async () => {
    const { vm, clientService } = getWrapper({ enabled: true, bannerText: 'Hi', infoText: 'x' })
    await vm.loadTask.last

    vm.bannerText = ''
    vm.saveTask.perform()
    await vm.saveTask.last

    expect(clientService.httpAuthenticated.put).toHaveBeenCalledWith('announcement', {
      enabled: false,
      bannerText: '',
      infoText: ''
    })
    expect(useConfigStore().options.announcement).toBeUndefined()
  })

  it('enables the saved announcement via the switch without publishing unsaved edits', async () => {
    const { vm, clientService } = getWrapper({
      enabled: false,
      bannerText: 'Hi',
      infoText: 'Details'
    })
    await vm.loadTask.last

    // unsaved edit in the form
    vm.bannerText = 'Unsaved edit'
    vm.onToggleEnabled(true)
    await vm.toggleTask.last

    // toggle persisted the stored text, not the unsaved edit
    expect(clientService.httpAuthenticated.put).toHaveBeenCalledWith('announcement', {
      enabled: true,
      bannerText: 'Hi',
      infoText: 'Details'
    })
    expect(useConfigStore().options.announcement).toEqual({ bannerText: 'Hi', infoText: 'Details' })
  })

  it('does not enable when nothing has been saved yet', async () => {
    const { vm, clientService } = getWrapper()
    await vm.loadTask.last

    vm.bannerText = 'Typed but not saved'
    vm.onToggleEnabled(true)

    expect(vm.enabled).toBe(false)
    expect(clientService.httpAuthenticated.put).not.toHaveBeenCalled()
  })

  it('reverts the switch when the toggle request fails', async () => {
    const { vm, clientService } = getWrapper({ enabled: false, bannerText: 'Hi', infoText: 'x' })
    await vm.loadTask.last
    clientService.httpAuthenticated.put.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vm.onToggleEnabled(true)
    await vm.toggleTask.last

    expect(vm.enabled).toBe(false)
    expect(useMessages().showErrorMessage).toHaveBeenCalled()
  })

  it('previews in the session only without persisting', async () => {
    const { vm, clientService } = getWrapper()
    await vm.loadTask.last

    vm.bannerText = 'Maintenance'
    editorState.content = 'Details'
    vm.preview()

    expect(useConfigStore().options.announcement).toEqual({
      bannerText: 'Maintenance',
      infoText: 'Details'
    })
    expect(clientService.httpAuthenticated.put).not.toHaveBeenCalled()
  })

  it('shows an error message when saving fails', async () => {
    const { vm, clientService } = getWrapper()
    await vm.loadTask.last
    clientService.httpAuthenticated.put.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vm.bannerText = 'Maintenance'
    vm.saveTask.perform()
    await vm.saveTask.last

    expect(useMessages().showErrorMessage).toHaveBeenCalled()
  })

  it('shows a size-specific error when the announcement is too large', async () => {
    const { vm, clientService } = getWrapper()
    await vm.loadTask.last
    clientService.httpAuthenticated.put.mockRejectedValue({ response: { status: 413 } })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vm.bannerText = 'Maintenance'
    vm.saveTask.perform()
    await vm.saveTask.last

    expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'The announcement is too large. Please shorten the info text.'
      })
    )
  })
})

function getWrapper(stored?: Partial<StoredAnnouncement>) {
  const clientService = mockDeep<ClientService>()
  clientService.httpAuthenticated.get.mockResolvedValue({
    data: { enabled: false, bannerText: '', infoText: '', ...stored }
  } as any)
  clientService.httpAuthenticated.put.mockResolvedValue({} as any)

  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  const wrapper = shallowMount(AnnouncementSection, {
    global: {
      plugins: [...defaultPlugins()],
      mocks,
      provide: mocks
    }
  })

  return {
    mocks,
    clientService,
    wrapper,
    vm: wrapper.vm as unknown as AnnouncementVm
  }
}
