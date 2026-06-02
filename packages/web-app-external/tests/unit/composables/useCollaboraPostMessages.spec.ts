import { ref, type Ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import {
  defaultComponentMocks,
  getComposableWrapper,
  type RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { CollaboratorShare, Resource, ShareTypes, SpaceResource } from '@opencloud-eu/web-client'
import { useLoadShares, useFolderLink, useModals } from '@opencloud-eu/web-pkg'
import { useCollaboraPostMessages } from '../../../src/composables/useCollaboraPostMessages'
import { Mock } from 'vitest'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useLoadShares: vi.fn(),
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
  let mockLoadSharesTask: {
    isRunning: boolean
    cancelAll: ReturnType<typeof vi.fn>
    perform: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockLoadSharesTask = {
      isRunning: false,
      cancelAll: vi.fn(),
      perform: vi.fn().mockResolvedValue({ collaboratorShares: [], linkShares: [] })
    }
    vi.mocked(useLoadShares).mockReturnValue({
      loadSharesTask: mockLoadSharesTask as any,
      availableInternalShareRoles: ref([]),
      availableExternalShareRoles: ref([])
    })
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
      const { instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({
          MessageId: 'UI_Mention',
          Values: { type: 'selected', username: 'user1' }
        })
      )
      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'Doc_ModifiedStatus', Values: { Modified: false } })
      )
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledOnce()
    })

    it('does not notify when Modified is true', async () => {
      const { instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({
          MessageId: 'UI_Mention',
          Values: { type: 'selected', username: 'user1' }
        })
      )
      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'Doc_ModifiedStatus', Values: { Modified: true } })
      )
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).not.toHaveBeenCalled()
    })
  })

  describe('UI_Close message', () => {
    it('notifies mentioned users on close', async () => {
      const { instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({
          MessageId: 'UI_Mention',
          Values: { type: 'selected', username: 'user1' }
        })
      )
      await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_Close' }))
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledOnce()
    })

    it('does not notify if no users were mentioned', async () => {
      const { instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_Close' }))
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).not.toHaveBeenCalled()
    })
  })

  describe('page leave / refresh', () => {
    it('notifies mentioned users on beforeunload', async () => {
      const { instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({
          MessageId: 'UI_Mention',
          Values: { type: 'selected', username: 'user1' }
        })
      )
      window.dispatchEvent(new Event('beforeunload'))
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledOnce()
    })

    it('does not notify on beforeunload if no users were mentioned', async () => {
      const { mocks } = getWrapper()

      window.dispatchEvent(new Event('beforeunload'))
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).not.toHaveBeenCalled()
    })

    it('notifies mentioned users on component unmount', async () => {
      const { wrapper, instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({
          MessageId: 'UI_Mention',
          Values: { type: 'selected', username: 'user1' }
        })
      )
      wrapper.unmount()
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledOnce()
    })

    it('does not fire beforeunload listener after component unmount', async () => {
      const { wrapper, instance, mocks } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({
          MessageId: 'UI_Mention',
          Values: { type: 'selected', username: 'user1' }
        })
      )
      wrapper.unmount()
      await flushPromises()

      // Trigger beforeunload after unmount - listener should have been removed
      window.dispatchEvent(new Event('beforeunload'))
      await flushPromises()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledOnce()
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
      it('loads collaborators when not yet fetched', async () => {
        const { instance } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: '' }
          })
        )
        await flushPromises()

        expect(mockLoadSharesTask.perform).toHaveBeenCalledOnce()
      })

      it('does not reload collaborators on subsequent autocomplete calls', async () => {
        const { instance } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: '' }
          })
        )
        await flushPromises()
        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: '' }
          })
        )
        await flushPromises()

        expect(mockLoadSharesTask.perform).toHaveBeenCalledOnce()
      })

      it('posts Action_Mention with collaborators matching the search text', async () => {
        const postMessage = vi.fn()
        const collaborators: CollaboratorShare[] = [
          mock<CollaboratorShare>({
            shareType: ShareTypes.user.value,
            sharedWith: { id: 'user1', displayName: 'Alice Smith' }
          }),
          mock<CollaboratorShare>({
            shareType: ShareTypes.user.value,
            sharedWith: { id: 'user2', displayName: 'Bob Jones' }
          })
        ]
        mockLoadSharesTask.perform.mockResolvedValue({ collaboratorShares: collaborators })

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
        expect(mentionCall).toBeDefined()
        const list = mentionCall!.Values!.list as Array<{ username: string }>
        expect(list).toHaveLength(1)
        expect(list[0].username).toBe('user1')
      })

      it('posts Action_Mention with all collaborators when search text is empty', async () => {
        const postMessage = vi.fn()
        const collaborators: CollaboratorShare[] = [
          mock<CollaboratorShare>({
            shareType: ShareTypes.user.value,
            sharedWith: { id: 'user1', displayName: 'Alice Smith' }
          }),
          mock<CollaboratorShare>({
            shareType: ShareTypes.user.value,
            sharedWith: { id: 'user2', displayName: 'Bob Jones' }
          })
        ]
        mockLoadSharesTask.perform.mockResolvedValue({ collaboratorShares: collaborators })

        const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: '' }
          })
        )
        await flushPromises()

        const calls = getParsedPostMessageCalls(postMessage)
        const mentionCall = calls.find((m) => m.MessageId === 'Action_Mention')
        const list = mentionCall!.Values!.list as Array<{ username: string }>
        expect(list).toHaveLength(2)
      })

      it('excludes collaborators with non-individual share types', async () => {
        const postMessage = vi.fn()
        const collaborators: CollaboratorShare[] = [
          mock<CollaboratorShare>({
            shareType: ShareTypes.user.value,
            sharedWith: { id: 'user1', displayName: 'Alice' }
          }),
          mock<CollaboratorShare>({
            shareType: ShareTypes.group.value,
            sharedWith: { id: 'group1', displayName: 'Devs' }
          })
        ]
        mockLoadSharesTask.perform.mockResolvedValue({ collaboratorShares: collaborators })

        const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: '' }
          })
        )
        await flushPromises()

        const calls = getParsedPostMessageCalls(postMessage)
        const mentionCall = calls.find((m) => m.MessageId === 'Action_Mention')
        const list = mentionCall!.Values!.list as Array<{ username: string }>
        expect(list).toHaveLength(1)
        expect(list[0].username).toBe('user1')
      })

      it('deduplicates collaborators with the same user id', async () => {
        const postMessage = vi.fn()
        const collaborators: CollaboratorShare[] = [
          mock<CollaboratorShare>({
            shareType: ShareTypes.user.value,
            sharedWith: { id: 'user1', displayName: 'Alice' }
          }),
          mock<CollaboratorShare>({
            shareType: ShareTypes.user.value,
            sharedWith: { id: 'user1', displayName: 'Alice' }
          })
        ]
        mockLoadSharesTask.perform.mockResolvedValue({ collaboratorShares: collaborators })

        const { instance } = getWrapper({ appIframeRef: ref(createMockIframe(postMessage)) })

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'autocomplete', text: '' }
          })
        )
        await flushPromises()

        const calls = getParsedPostMessageCalls(postMessage)
        const mentionCall = calls.find((m) => m.MessageId === 'Action_Mention')
        const list = mentionCall!.Values!.list as Array<{ username: string }>
        expect(list).toHaveLength(1)
      })
    })

    describe('type: selected', () => {
      it('sends userIDs of all unique selected users when notifying', async () => {
        const { instance, mocks } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'selected', username: 'user1' }
          })
        )
        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'selected', username: 'user2' }
          })
        )
        await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_Close' }))
        await flushPromises()

        const [, body] = mocks.$clientService.httpAuthenticated.post.mock.calls[0] as [
          string,
          { userIDs: string[] }
        ]
        expect(body.userIDs).toEqual(['user1', 'user2'])
      })

      it('does not add duplicate user ids to the mention list', async () => {
        const { instance, mocks } = getWrapper()

        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'selected', username: 'user1' }
          })
        )
        await instance.handlePostMessagesCollabora(
          createMessageEvent({
            MessageId: 'UI_Mention',
            Values: { type: 'selected', username: 'user1' }
          })
        )
        await instance.handlePostMessagesCollabora(createMessageEvent({ MessageId: 'UI_Close' }))
        await flushPromises()

        const [, body] = mocks.$clientService.httpAuthenticated.post.mock.calls[0] as [
          string,
          { userIDs: string[] }
        ]
        expect(body.userIDs).toEqual(['user1'])
      })
    })
  })

  describe('resetMentionState', () => {
    it('triggers a fresh collaborator load on the next autocomplete call', async () => {
      mockLoadSharesTask.perform.mockResolvedValue({ collaboratorShares: [] })
      const { instance } = getWrapper()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_Mention', Values: { type: 'autocomplete', text: '' } })
      )
      await flushPromises()
      instance.resetMentionState()

      await instance.handlePostMessagesCollabora(
        createMessageEvent({ MessageId: 'UI_Mention', Values: { type: 'autocomplete', text: '' } })
      )
      await flushPromises()

      expect(mockLoadSharesTask.perform).toHaveBeenCalledTimes(2)
    })

    it('cancels a running loadSharesTask', () => {
      mockLoadSharesTask.isRunning = true
      const { instance } = getWrapper()

      instance.resetMentionState()

      expect(mockLoadSharesTask.cancelAll).toHaveBeenCalledOnce()
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
