import { computed, ref, type Ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import {
  defaultComponentMocks,
  getComposableWrapper,
  type RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  useMentionUsers,
  useFolderLink,
  useModals,
  useMessages,
  LocationPickerModal
} from '@opencloud-eu/web-pkg'
import { useCollaboraPostMessages } from '../../../src/composables/useCollaboraPostMessages'
import { Mock } from 'vitest'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useMentionUsers: vi.fn(),
  useFolderLink: vi.fn()
}))

let currentAppIframeRef: Ref<HTMLIFrameElement | null>

const createMessageEvent = (
  data: Record<string, unknown>,
  source: unknown = currentAppIframeRef?.value?.contentWindow
) => {
  const event = new MessageEvent('message', { data: JSON.stringify(data) })
  Object.defineProperty(event, 'source', { value: source })
  return event
}

const createMockIframe = (postMessage = vi.fn()): HTMLIFrameElement =>
  ({ contentWindow: { postMessage } }) as unknown as HTMLIFrameElement

const getParsedPostMessageCalls = (postMessage: ReturnType<typeof vi.fn>) =>
  postMessage.mock.calls.map(
    (call) =>
      JSON.parse(call[0] as string) as { MessageId: string; Values?: Record<string, unknown> }
  )

describe('useCollaboraPostMessages', () => {
  let mockMentionUsers: ReturnType<typeof useMentionUsers>

  beforeEach(() => {
    mockMentionUsers = {
      getMentionUsers: vi.fn().mockResolvedValue([]),
      notifyMentionedUsers: vi.fn().mockResolvedValue(undefined),
      ownMentionLabel: computed(() => 'Own User'),
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

  describe('message sender verification', () => {
    it.each([
      { description: 'another window', source: {} },
      { description: 'no window', source: null }
    ])('ignores messages sent by $description', async ({ source }) => {
      const { instance, onClose } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_Close' }, source)
      )

      expect(onClose).not.toHaveBeenCalled()
      expect(mockMentionUsers.notifyMentionedUsers).not.toHaveBeenCalled()
    })

    it('ignores messages when the iframe is not available', async () => {
      const { instance, onClose } = getWrapper({
        appIframeRef: ref<HTMLIFrameElement | null>(null)
      })

      await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_Close' }, {}))

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('postMessageToCollabora', () => {
    it('logs an error when the iframe is not available', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const appIframeRef = ref<HTMLIFrameElement | null>(createMockIframe())
      const { instance, mocks } = getWrapper({ appIframeRef })
      mocks.$clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>(),
        children: []
      })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_SaveAs', Values: {} })
      )
      appIframeRef.value = null
      const { dispatchModal } = useModals()
      const { callbackFn } = (dispatchModal as Mock).mock.calls[0][0].customComponentAttrs()
      await callbackFn([mock<Resource>({ storageId: 'storage-1', path: '/folder' })], {
        fileName: 'new.odt'
      })

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
    it('closes the app, e.g. via the back button of the mobile toolbar', async () => {
      const { instance, onClose } = getWrapper()

      await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_Close' }))

      expect(onClose).toHaveBeenCalledOnce()
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
    const getModalOptions = async (
      instance: ReturnType<typeof useCollaboraPostMessages>,
      values = {}
    ) => {
      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_SaveAs', Values: values })
      )
      const { dispatchModal } = useModals()
      return (dispatchModal as Mock).mock.calls[0][0]
    }

    const pickLocation = async (
      { instance, mocks }: ReturnType<typeof getWrapper>,
      targetFolder: Partial<Resource>,
      fileName: string,
      existingNames: string[] = []
    ) => {
      mocks.$clientService.webdav.listFiles.mockResolvedValue({
        resource: mock<Resource>(),
        children: existingNames.map((name) => mock<Resource>({ name }))
      })
      const { customComponentAttrs } = await getModalOptions(instance)
      await customComponentAttrs().callbackFn(
        [mock<Resource>({ storageId: 'storage-1', fileId: 'target-id', ...targetFolder })],
        { fileName }
      )
      await flushPromises()
    }

    it('dispatches the location picker in the folder of the current file', async () => {
      const { instance } = getWrapper()

      const modalOptions = await getModalOptions(instance)

      expect(modalOptions.customComponent).toBe(LocationPickerModal)
      expect(modalOptions.customComponentAttrs()).toMatchObject({
        submitButtonTitle: 'Save',
        chooseFileName: true,
        chooseFileNameSuggestion: 'test.odt'
      })
      expect(useFolderLink().getParentFolderLink).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test.odt' })
      )
    })

    it('suggests the file name with the export format', async () => {
      const { instance } = getWrapper()

      const modalOptions = await getModalOptions(instance, { format: 'pdf' })

      expect(modalOptions.title).toBe('Export »test.odt« as pdf')
      expect(modalOptions.customComponentAttrs()).toMatchObject({
        submitButtonTitle: 'Export',
        chooseFileNameSuggestion: 'test.pdf'
      })
    })

    it.each([
      { targetPath: '/folder', expected: 'copy.odt' },
      { targetPath: '/folder/sub/deeper', expected: 'sub/deeper/copy.odt' }
    ])(
      'saves into $targetPath relative to the folder of the current file',
      async ({ targetPath, expected }) => {
        const postMessage = vi.fn()
        const wrapper = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

        await pickLocation(wrapper, { path: targetPath }, 'copy.odt')

        expect(wrapper.mocks.$clientService.webdav.listFiles).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ fileId: 'target-id', path: targetPath }),
          expect.anything()
        )
        expect(getParsedPostMessageCalls(postMessage)).toContainEqual(
          expect.objectContaining({
            MessageId: 'Action_SaveAs',
            Values: { Filename: expected, Notify: true }
          })
        )
      }
    )

    it('picks a free name when the file already exists', async () => {
      const postMessage = vi.fn()
      const wrapper = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

      await pickLocation(wrapper, { path: '/folder/sub' }, 'copy.odt', ['copy.odt'])

      expect(getParsedPostMessageCalls(postMessage)).toContainEqual(
        expect.objectContaining({ Values: { Filename: 'sub/copy (1).odt', Notify: true } })
      )
    })

    it('shows an error when the target folder cannot be listed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const postMessage = vi.fn()
      const { instance, mocks } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })
      mocks.$clientService.webdav.listFiles.mockRejectedValue(new Error('offline'))

      const { customComponentAttrs } = await getModalOptions(instance)
      await customComponentAttrs().callbackFn(
        [mock<Resource>({ storageId: 'storage-1', path: '/folder' })],
        { fileName: 'copy.odt' }
      )

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledOnce()
      expect(getParsedPostMessageCalls(postMessage)).not.toContainEqual(
        expect.objectContaining({ MessageId: 'Action_SaveAs' })
      )
    })

    it.each([
      { path: '/', storageId: 'storage-1' },
      { path: '/other', storageId: 'storage-1' },
      { path: '/folder', storageId: 'storage-2' }
    ])('shows an error for a location outside of the current folder (%o)', async (targetFolder) => {
      const postMessage = vi.fn()
      const wrapper = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

      await pickLocation(wrapper, targetFolder, 'copy.odt')

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledOnce()
      expect(getParsedPostMessageCalls(postMessage)).not.toContainEqual(
        expect.objectContaining({ MessageId: 'Action_SaveAs' })
      )
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
      const newFile = mock<Resource>({
        name: 'renamed.docx',
        path: '/folder/sub/renamed.docx',
        fileId: 'new-file-id'
      })
      const mocks = defaultComponentMocks({
        currentRoute: mock<RouteLocation>({
          name: 'external',
          params: { driveAliasAndItem: 'share/folder/original.odt' },
          query: {}
        })
      })
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(newFile)
      const space = ref(
        mock<SpaceResource>({
          getDriveAliasAndItem: ({ path }: Resource) => `share${path}`
        })
      )

      const { instance } = getWrapper({
        mocks,
        space,
        resource: ref(mock<Resource>({ name: 'original.odt', path: '/folder/original.odt' }))
      })

      await instance.handlePostMessagesCollabora(
        createMessageEvent({
          MessageId: 'Action_Save_Resp',
          Values: { fileName: 'sub/renamed.docx' }
        })
      )
      await flushPromises()

      expect(mocks.$clientService.webdav.getFileInfo).toHaveBeenCalledWith(space.value, {
        path: '/folder/sub/renamed.docx',
        fileId: undefined
      })
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ driveAliasAndItem: 'share/folder/sub/renamed.docx' }),
          query: expect.objectContaining({ fileId: 'new-file-id' })
        })
      )
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
        vi.mocked(mockMentionUsers.getMentionUsers).mockResolvedValue([
          { id: 'user1', label: 'Alice Smith' }
        ])

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

        expect(mockMentionUsers.selectMentionUser).toHaveBeenCalledWith({
          id: 'user1',
          label: 'user1'
        })
      })

      it('remembers the label the autocomplete list was built with', async () => {
        vi.mocked(mockMentionUsers.getMentionUsers).mockResolvedValue([
          { id: 'user1', label: 'Alice Smith' }
        ])
        const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(vi.fn())) })

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: 'a' }
          })
        )
        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'selected', username: 'user1' }
          })
        )

        expect(mockMentionUsers.selectMentionUser).toHaveBeenCalledWith({
          id: 'user1',
          label: 'Alice Smith'
        })
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

  describe('invalid message', () => {
    it('handles malformed JSON without throwing', async () => {
      const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
      const { instance } = getWrapper()
      const event = new MessageEvent('message', { data: 'not-valid-json{' })
      Object.defineProperty(event, 'source', { value: currentAppIframeRef.value.contentWindow })

      await expect(instance.handlePostMessagesCollabora(event)).resolves.toBeUndefined()

      expect(consoleDebug).toHaveBeenCalled()
    })
  })
})

function getWrapper({
  appIframeRef = ref<HTMLIFrameElement | null>(createMockIframe()),
  space = ref(mock<SpaceResource>()),
  resource = ref(
    mock<Resource>({
      name: 'test.odt',
      extension: 'odt',
      path: '/folder/test.odt',
      storageId: 'storage-1'
    })
  ),
  mocks = defaultComponentMocks()
}: {
  appIframeRef?: Ref<HTMLIFrameElement | null>
  space?: Ref<SpaceResource>
  resource?: Ref<Resource>
  mocks?: ReturnType<typeof defaultComponentMocks>
} = {}) {
  let instance!: ReturnType<typeof useCollaboraPostMessages>
  const onClose = vi.fn()
  currentAppIframeRef = appIframeRef

  const wrapper = getComposableWrapper(
    () => {
      instance = useCollaboraPostMessages({ space, resource, appIframeRef, onClose })
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

  return { wrapper, instance, mocks, onClose }
}
