import AnnouncementSection from '../../../../src/components/General/AnnouncementSection.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mockDeep } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
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

describe('AnnouncementSection', () => {
  beforeEach(() => {
    editorState.content = ''
  })

  it('loads the stored announcement on mount and mirrors the live banner when enabled', async () => {
    const { wrapper } = getWrapper({ enabled: true, bannerText: 'Hi', infoText: 'Details' })
    await flushPromises()

    expect(getSwitch(wrapper).props('checked')).toBe(true)
    expect(getBannerInput(wrapper).props('modelValue')).toBe('Hi')
    expect(useConfigStore().options.announcement).toEqual({ bannerText: 'Hi', infoText: 'Details' })
  })

  it('saves the text via PUT while keeping the current (disabled) state hidden', async () => {
    const { wrapper, clientService } = getWrapper()
    await flushPromises()

    await setBannerText(wrapper, 'Maintenance')
    editorState.content = 'Details'
    await clickButton(wrapper, 'Save')

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
    const { wrapper, clientService } = getWrapper({
      enabled: true,
      bannerText: 'Hi',
      infoText: 'x'
    })
    await flushPromises()

    await setBannerText(wrapper, '')
    await clickButton(wrapper, 'Save')

    expect(clientService.httpAuthenticated.put).toHaveBeenCalledWith('announcement', {
      enabled: false,
      bannerText: '',
      infoText: ''
    })
    expect(useConfigStore().options.announcement).toBeUndefined()
  })

  it('enables the saved announcement via the switch without publishing unsaved edits', async () => {
    const { wrapper, clientService } = getWrapper({
      enabled: false,
      bannerText: 'Hi',
      infoText: 'Details'
    })
    await flushPromises()

    // unsaved edit in the form
    await setBannerText(wrapper, 'Unsaved edit')
    getSwitch(wrapper).vm.$emit('update:checked', true)
    await flushPromises()

    // toggle persisted the stored text, not the unsaved edit
    expect(clientService.httpAuthenticated.put).toHaveBeenCalledWith('announcement', {
      enabled: true,
      bannerText: 'Hi',
      infoText: 'Details'
    })
    expect(useConfigStore().options.announcement).toEqual({ bannerText: 'Hi', infoText: 'Details' })
  })

  it('disables the switch until a banner text has been saved', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    // nothing saved yet -> the switch cannot be toggled
    expect(getSwitch(wrapper).props('disabled')).toBe(true)
  })

  it('reverts the switch when the toggle request fails', async () => {
    const { wrapper, clientService } = getWrapper({
      enabled: false,
      bannerText: 'Hi',
      infoText: 'x'
    })
    await flushPromises()
    clientService.httpAuthenticated.put.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    getSwitch(wrapper).vm.$emit('update:checked', true)
    await flushPromises()

    expect(getSwitch(wrapper).props('checked')).toBe(false)
    expect(useMessages().showErrorMessage).toHaveBeenCalled()
  })

  it('previews in the session only without persisting', async () => {
    const { wrapper, clientService } = getWrapper()
    await flushPromises()

    await setBannerText(wrapper, 'Maintenance')
    editorState.content = 'Details'
    await clickButton(wrapper, 'Preview')

    expect(useConfigStore().options.announcement).toEqual({
      bannerText: 'Maintenance',
      infoText: 'Details'
    })
    expect(clientService.httpAuthenticated.put).not.toHaveBeenCalled()
  })

  it('shows an error message when saving fails', async () => {
    const { wrapper, clientService } = getWrapper()
    await flushPromises()
    clientService.httpAuthenticated.put.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await setBannerText(wrapper, 'Maintenance')
    await clickButton(wrapper, 'Save')

    expect(useMessages().showErrorMessage).toHaveBeenCalled()
  })

  it('shows a size-specific error when the announcement is too large', async () => {
    const { wrapper, clientService } = getWrapper()
    await flushPromises()
    clientService.httpAuthenticated.put.mockRejectedValue({ response: { status: 413 } })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await setBannerText(wrapper, 'Maintenance')
    await clickButton(wrapper, 'Save')

    expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'The announcement is too large. Please shorten the info text.'
      })
    )
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

function getBannerInput(wrapper: Wrapper) {
  return wrapper.findComponent({ name: 'OcTextInput' })
}

function getSwitch(wrapper: Wrapper) {
  return wrapper.findComponent({ name: 'OcSwitch' })
}

async function setBannerText(wrapper: Wrapper, value: string) {
  getBannerInput(wrapper).vm.$emit('update:modelValue', value)
  await flushPromises()
}

async function clickButton(wrapper: Wrapper, text: string) {
  const button = wrapper
    .findAllComponents({ name: 'OcButton' })
    .find((b) => b.text().trim() === text)
  button.vm.$emit('click')
  await flushPromises()
}

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
      provide: mocks,
      renderStubDefaultSlot: true
    }
  })

  return {
    mocks,
    clientService,
    wrapper
  }
}
