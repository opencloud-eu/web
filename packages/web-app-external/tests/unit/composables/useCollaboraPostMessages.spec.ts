import { ref, type Ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import {
  defaultComponentMocks,
  getComposableWrapper,
  type RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useMentionUsers, useFolderLink, useModals } from '@opencloud-eu/web-pkg'
import { useCollaboraPostMessages } from '../../../src/composables/useCollaboraPostMessages'
import { Mock } from 'vitest'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useMentionUsers: vi.fn(),
  useFolderLink: vi.fn()
}))

const createMessageEvent = (data: Record<string, unknown>) =>
  new MessageEvent('message', { data: JSON.stringify(data) })

const createMockIframe = (postMessage = vi.fn()): HTMLIFrameElement =>
  ({ contentWindow: { postMessage } }) as unknown as HTMLIFrameElement

const getParsedPostMessageCalls = (postMessage: ReturnType<typeof vi.fn>) =>
  postMessage.mock.calls.map(
    (call) =>
      JSON.parse(call[0] as string) as { MessageId: string; Values?: Record<string, unknown> }
  )

describe('useCollaboraPostMessages', () => {
  let mockMentionUsers: {
    getMentionUsers: Mock
    notifyMentionedUsers: Mock
    resetMentionState: Mock
    selectMentionUser: Mock
  }

  beforeEach(() => {
    mockMentionUsers = {
      getMentionUsers: vi.fn().mockResolvedValue([]),
      notifyMentionedUsers: vi.fn().mockResolvedValue(undefined),
      resetMentionState: vi.fn(),
      selectMentionUser: vi.fn()
    }
    vi.mocked(useMentionUsers).mockReturnValue(mockMentionUsers)
    vi.mocked(useFolderLink).mockReturnValue({
      getParentFolderLink: vi.fn().mockReturnValue({}),
      getFolderLink: vi.fn(),
      getPathPrefix: vi.fn(),
      getParentFolderName: vi.fn(),
      getParentFolderLinkIconAdditionalAttributes: vi.fn()
    })
  })

  describe('postMessageToCollabora', () => {
    it('logs an error when the iframe is not available', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance } = getWrapper({ appIframeRef: null })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'App_LoadingStatus', Values: { Status: 'Frame_Ready' } })
      )

      expect(consoleError).toHaveBeenCalledWith('Collabora iframe not found')
    })

    it('sends the message as JSON to the iframe content window', async () => {
      const postMessage = vi.fn()
      const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'App_LoadingStatus', Values: { Status: 'Loading' } })
      )

      expect(postMessage).toHaveBeenCalledWith(expect.stringContaining('"MessageId"'), '*')
      const [data] = postMessage.mock.calls[0]
      const parsed = JSON.parse(data as string)
      expect(parsed).toHaveProperty('MessageId')
      expect(parsed).toHaveProperty('SendTime')
    })
  })

  describe('App_LoadingStatus message', () => {
    it('always posts Hide_Button with id toggledarktheme', async () => {
      const postMessage = vi.fn()
      const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'App_LoadingStatus', Values: { Status: 'Loading' } })
      )

      const calls = getParsedPostMessageCalls(postMessage)
      const hideButton = calls.find((m) => m.MessageId === 'Hide_Button')
      expect(hideButton?.Values).toEqual({ id: 'toggledarktheme' })
    })

    it('posts Host_PostmessageReady when Status is Frame_Ready', async () => {
      const postMessage = vi.fn()
      const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'App_LoadingStatus', Values: { Status: 'Frame_Ready' } })
      )

      const messageIds = getParsedPostMessageCalls(postMessage).map((m) => m.MessageId)
      expect(messageIds).toContain('Host_PostmessageReady')
    })

    it('does not post Host_PostmessageReady when Status is not Frame_Ready', async () => {
      const postMessage = vi.fn()
      const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'App_LoadingStatus', Values: { Status: 'Loading' } })
      )

      const messageIds = getParsedPostMessageCalls(postMessage).map((m) => m.MessageId)
      expect(messageIds).not.toContain('Host_PostmessageReady')
    })
  })

  describe('Doc_ModifiedStatus message', () => {
    it('notifies mentioned users when Modified is false', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'Doc_ModifiedStatus', Values: { Modified: false } })
      )
      await flushPromises()

      expect(mockMentionUsers.notifyMentionedUsers).toHaveBeenCalledOnce()
    })

    it('does not notify when Modified is true', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'Doc_ModifiedStatus', Values: { Modified: true } })
      )
      await flushPromises()

      expect(mockMentionUsers.notifyMentionedUsers).not.toHaveBeenCalled()
    })
  })

  describe('UI_Close message', () => {
    it('notifies mentioned users on close', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_Close' }))
      await flushPromises()

      expect(mockMentionUsers.notifyMentionedUsers).toHaveBeenCalledOnce()
    })
  })

  describe('page leave / refresh', () => {
    it('notifies mentioned users on beforeunload', async () => {
      getWrapper()

      window.dispatchEvent(new Event('beforeunload'))
      await flushPromises()

      expect(mockMentionUsers.notifyMentionedUsers).toHaveBeenCalledOnce()
    })

    it('notifies mentioned users on component unmount', async () => {
      const { wrapper } = getWrapper()

      wrapper.unmount()
      await flushPromises()

      expect(mockMentionUsers.notifyMentionedUsers).toHaveBeenCalledOnce()
    })

    it('does not fire beforeunload listener after component unmount', async () => {
      const { wrapper } = getWrapper()

      wrapper.unmount()
      await flushPromises()

      // Trigger beforeunload after unmount - listener should have been removed
      window.dispatchEvent(new Event('beforeunload'))
      await flushPromises()

      expect(mockMentionUsers.notifyMentionedUsers).toHaveBeenCalledOnce()
    })
  })

  describe('UI_SaveAs message', () => {
    it('dispatches FileNameModal with format name in title when format is provided', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_SaveAs', Values: { format: 'docx' } })
      )

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledOnce()
    })

    it('passes the format as fileExtension to the modal component attrs when format is provided', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_SaveAs', Values: { format: 'docx' } })
      )

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalled()
    })

    it('dispatches FileNameModal with save-as title when no format is provided', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_SaveAs', Values: {} })
      )

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalled()
    })
  })

  describe('Action_Save_Resp message', () => {
    it('returns early when fileName is not provided', async () => {
      const { instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'Action_Save_Resp', Values: {} })
      )
      await flushPromises()

      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
    })

    it('fetches the new file info and navigates to it', async () => {
      const newFile = mock<Resource>({ name: 'renamed.docx', fileId: 'new-file-id' })
      const mocks = defaultComponentMocks({
        currentRoute: mock<RouteLocation>({
          name: 'external',
          params: { driveAliasAndItem: 'personal/original.odt' },
          query: {}
        })
      })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(newFile)

      const { instance } = getWrapper({
        mocks,
        resource: ref(mock<Resource>({ name: 'original.odt', path: '/folder/original.odt' }))
      })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'Action_Save_Resp', Values: { fileName: 'renamed.docx' } })
      )
      await flushPromises()

      expect(mocks.$clientService.webdav.getFileInfo).toHaveBeenCalledOnce()
      expect(mocks.$router.push).toHaveBeenCalledOnce()
    })
  })

  describe('UI_InsertGraphic message', () => {
    it('dispatches a file picker modal', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_InsertGraphic' })
      )

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledOnce()
    })

    it('restricts allowed file types to images', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_InsertGraphic' })
      )

      const { dispatchModal } = useModals()
      const [modalOptions] = (dispatchModal as Mock).mock.calls[0]
      expect(modalOptions.customComponentAttrs().allowedFileTypes).toEqual([
        'image/png',
        'image/gif',
        'image/jpeg',
        'image/svg'
      ])
    })
  })

  describe('UI_InsertFile message', () => {
    it('returns early when callback value is not a string', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_InsertFile', Values: { callback: 42 } })
      )

      const { dispatchModal } = useModals()
      expect(dispatchModal).not.toHaveBeenCalled()
    })

    it.each(['Action_CompareDocuments', 'Action_InsertFile'])(
      'dispatches modal for %s callback',
      async (callback) => {
        const { instance } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_InsertFile',
            Values: { callback }
          })
        )

        const { dispatchModal } = useModals()
        expect(dispatchModal).toHaveBeenCalled()
      }
    )
  })

  describe('UI_PickLink message', () => {
    it('dispatches a file picker modal', async () => {
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_PickLink' }))

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledOnce()
    })
  })

  describe('UI_Mention message', () => {
    describe('type: autocomplete', () => {
      it.each([
        ['the given search text', { type: 'autocomplete', text: 'alice' }, 'alice'],
        ['an empty search text when no text is given', { type: 'autocomplete' }, '']
      ])('requests the mention users for %s', async (_description, values, query) => {
        const { instance } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({ MessageId: 'UI_Mention', Values: values })
        )
        await flushPromises()

        expect(mockMentionUsers.getMentionUsers).toHaveBeenCalledWith(query)
      })

      it('posts Action_Mention with the mention users', async () => {
        const postMessage = vi.fn()
        mockMentionUsers.getMentionUsers.mockResolvedValue([{ id: 'user1', label: 'Alice Smith' }])

        const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: 'alice' }
          })
        )
        await flushPromises()

        const calls = getParsedPostMessageCalls(postMessage)
        const mentionCall = calls.find((m) => m.MessageId === 'Action_Mention')
        expect(mentionCall!.Values!.list).toEqual([
          expect.objectContaining({ username: 'user1', label: 'Alice Smith' })
        ])
      })
    })

    describe('type: selected', () => {
      it('remembers the selected user', async () => {
        const { instance } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'selected', username: 'user1' }
          })
        )

        expect(mockMentionUsers.selectMentionUser).toHaveBeenCalledWith('user1')
      })

      it('ignores a selection without a username', async () => {
        const { instance } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({ MessageId: 'UI_Mention', Values: { type: 'selected' } })
        )

        expect(mockMentionUsers.selectMentionUser).not.toHaveBeenCalled()
      })
    })
  })

  describe('resetMentionState', () => {
    it('resets the mention state of the current resource', () => {
      const { instance } = getWrapper()

      instance.resetMentionState()

      expect(mockMentionUsers.resetMentionState).toHaveBeenCalledOnce()
    })
  })

  describe('invalid message', () => {
    it('handles malformed JSON without throwing', async () => {
      const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
      const { instance } = getWrapper()

      await expect(
        instance.handlePostMessagesCollabora(
          new MessageEvent('message', { data: 'not-valid-json{' })
        )
      ).resolves.toBeUndefined()

      expect(consoleDebug).toHaveBeenCalled()
    })
  })
})

function getWrapper({
  appIframeRef = ref<HTMLIFrameElement | null>(createMockIframe()),
  space = ref(mock<SpaceResource>()),
  resource = ref(mock<Resource>({ name: 'test.odt', path: '/folder/test.odt' })),
  mocks = defaultComponentMocks()
}: {
  appIframeRef?: Ref<HTMLIFrameElement | null>
  space?: Ref<SpaceResource>
  resource?: Ref<Resource>
  mocks?: ReturnType<typeof defaultComponentMocks>
} = {}) {
  let instance!: ReturnType<typeof useCollaboraPostMessages>

  const wrapper = getComposableWrapper(
    () => {
      instance = useCollaboraPostMessages({ space, resource, appIframeRef })
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          configState: { server: 'https://example.com/' }
        }
      }
    }
  )

  return { wrapper, instance, mocks }
}
