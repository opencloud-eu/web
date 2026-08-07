import { PartialComponentProps, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useMentionUsers } from '@opencloud-eu/web-pkg'
import {
  useTextEditor,
  type MentionItem,
  type TextEditorInstance
} from '@opencloud-eu/web-pkg/editor'
import App from '../../src/App.vue'

vi.mock('@opencloud-eu/web-pkg')
vi.mock('@opencloud-eu/web-pkg/editor')

describe('Text editor app', () => {
  const getMentionUsers = vi.fn<(query: string) => Promise<MentionItem[]>>()
  const notifyMentionedUsers = vi.fn<() => Promise<void>>()
  const resetMentionState = vi.fn()
  const selectMentionUser = vi.fn()

  beforeEach(() => {
    getMentionUsers.mockResolvedValue([])
    notifyMentionedUsers.mockResolvedValue()
    vi.mocked(useMentionUsers).mockReturnValue({
      getMentionUsers,
      notifyMentionedUsers,
      resetMentionState,
      selectMentionUser
    })
    vi.mocked(useTextEditor).mockReturnValue(mock<TextEditorInstance>())
  })

  it('shows the editor', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('.oc-text-editor').exists()).toBeTruthy()
  })

  it('provides mention users to the editor and remembers a selection', async () => {
    const mentionUsers = [{ id: 'alice', label: 'Alice' }]
    getMentionUsers.mockResolvedValue(mentionUsers)
    getWrapper()

    const options = vi.mocked(useTextEditor).mock.calls[0][0]
    await expect(options.mentions?.items('ali')).resolves.toEqual(mentionUsers)
    options.mentions?.onSelect(mentionUsers[0])

    expect(getMentionUsers).toHaveBeenCalledWith('ali')
    expect(selectMentionUser).toHaveBeenCalledWith('alice')
  })

  it('registers mention notifications as a save callback', async () => {
    const { wrapper } = getWrapper()
    const [[saveCallback]] = wrapper.emitted('register:onSaveCallback') as [[() => Promise<void>]]

    await saveCallback()

    expect(notifyMentionedUsers).toHaveBeenCalledOnce()
  })
})

function getWrapper(props: PartialComponentProps<typeof App> = {}) {
  return {
    wrapper: mount(App, {
      props: {
        currentContent: '',
        isReadOnly: false,
        resource: mock<Resource>({ extension: 'txt', mimeType: 'text/plain' }),
        space: mock<SpaceResource>(),
        ...props
      },
      global: { plugins: defaultPlugins() }
    })
  }
}
