import { onMounted, onBeforeUnmount, ref, unref, type Ref, markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  CollaboratorShare,
  Resource,
  SpaceResource,
  ShareTypes,
  urlJoin
} from '@opencloud-eu/web-client'
import { DavProperty } from '@opencloud-eu/web-client/webdav'
import {
  useRoute,
  useRouter,
  useClientService,
  useModals,
  useFolderLink,
  useSharesStore,
  useLoadShares,
  useConfigStore,
  queryItemAsString,
  FilePickerModal
} from '@opencloud-eu/web-pkg'
import FileNameModal from '../components/FileNameModal.vue'

interface CollaboraMessage {
  MessageId: string
  Values?: Record<string, unknown>
}

export function useCollaboraPostMessages({
  space,
  resource,
  appIframeRef
}: {
  space: Ref<SpaceResource>
  resource: Ref<Resource>
  appIframeRef: Ref<HTMLIFrameElement | null>
}) {
  const { $gettext } = useGettext()
  const route = useRoute()
  const router = useRouter()
  const { httpAuthenticated, webdav } = useClientService()
  const { dispatchModal } = useModals()
  const { getParentFolderLink } = useFolderLink()
  const sharesStore = useSharesStore()
  const { loadSharesTask } = useLoadShares()
  const configStore = useConfigStore()

  const collaborators = ref<CollaboratorShare[]>([])
  const collaboratorsFetched = ref(false)
  const userIdsToMention = ref<string[]>([])

  function postMessageToCollabora(messageId: string, values?: Record<string, unknown>): void {
    const iframe = unref(appIframeRef)
    if (!iframe) {
      console.error('Collabora iframe not found')
      return
    }
    iframe.contentWindow.postMessage(
      JSON.stringify({
        MessageId: messageId,
        SendTime: Date.now(),
        ...(values && { Values: values })
      }),
      '*'
    )
  }

  function handleAppLoadingStatus(message: CollaboraMessage): void {
    postMessageToCollabora('Hide_Button', { id: 'toggledarktheme' })
    if (message.Values?.Status === 'Frame_Ready') {
      postMessageToCollabora('Host_PostmessageReady')
    }
  }

  function handleDocModifiedStatus(message: CollaboraMessage): void {
    if (message.Values?.Modified === false) {
      notifyMentionedUsers()
    }
  }

  function handleUiClose(): void {
    notifyMentionedUsers()
  }

  function handleUiSaveAs(message: CollaboraMessage): void {
    const currentResource = unref(resource)
    const currentSpace = unref(space)

    if (Object.hasOwn(message.Values ?? {}, 'format')) {
      dispatchModal({
        title: $gettext('Export »%{name}« as %{format}', {
          name: currentResource.name,
          format: message.Values.format as string
        }),
        customComponent: markRaw(FileNameModal),
        customComponentAttrs: () => ({
          space: currentSpace,
          resource: currentResource,
          fileExtension: message.Values.format,
          callbackFn: (newFileName: string) => {
            postMessageToCollabora('Action_SaveAs', { Filename: newFileName, Notify: true })
          }
        })
      })
      return
    }

    dispatchModal({
      title: $gettext('Save »%{name}« with new name', { name: currentResource.name }),
      customComponent: markRaw(FileNameModal),
      customComponentAttrs: () => ({
        space: currentSpace,
        resource: currentResource,
        callbackFn: (newFileName: string) => {
          postMessageToCollabora('Action_SaveAs', { Filename: newFileName, Notify: true })
        }
      })
    })
  }

  async function handleActionSaveResp(message: CollaboraMessage): Promise<void> {
    if (!message.Values?.fileName) {
      return
    }

    const currentResource = unref(resource)
    const currentSpace = unref(space)

    // FIXME: when we move to id based propfinds we magically need a fileId for the new file. Collabora doesn't provide that.
    const newFile = await webdav.getFileInfo(currentSpace, {
      path:
        currentResource.path.substring(
          0,
          currentResource.path.length - currentResource.name.length
        ) + (message.Values.fileName as string),
      fileId: undefined
    })
    await router.push({
      name: unref(route).name,
      params: {
        ...unref(route).params,
        driveAliasAndItem: queryItemAsString(unref(route).params.driveAliasAndItem).replace(
          currentResource.name,
          newFile.name
        )
      },
      query: {
        ...unref(route).query,
        fileId: newFile.fileId
      }
    })
  }

  function handleUiInsertGraphic(): void {
    const currentResource = unref(resource)
    const currentSpace = unref(space)

    dispatchModal({
      elementClass: 'file-picker-modal',
      title: $gettext('Insert graphic'),
      customComponent: markRaw(FilePickerModal),
      hideActions: true,
      customComponentAttrs: () => ({
        parentFolderLink: getParentFolderLink(currentResource),
        allowedFileTypes: ['image/png', 'image/gif', 'image/jpeg', 'image/svg'],
        callbackFn: async ({ resource: pickedResource }: { resource: Resource }) => {
          const { downloadURL: url } = await webdav.getFileInfo(currentSpace, pickedResource, {
            davProperties: [DavProperty.DownloadURL]
          })
          postMessageToCollabora('Action_InsertGraphic', { url })
        }
      }),
      focusTrapInitial: false
    })
  }

  function handleUiInsertFile(message: CollaboraMessage): void {
    const currentResource = unref(resource)
    const currentSpace = unref(space)
    const callback = message.Values?.callback
    const mimeTypeFilter = message.Values?.mimeTypeFilter

    if (typeof callback !== 'string') {
      return
    }

    dispatchModal({
      elementClass: 'file-picker-modal',
      title:
        callback === 'Action_CompareDocuments'
          ? $gettext('Select document to compare')
          : $gettext('Insert file'),
      customComponent: markRaw(FilePickerModal),
      hideActions: true,
      customComponentAttrs: () => ({
        parentFolderLink: getParentFolderLink(currentResource),
        allowedFileTypes: (mimeTypeFilter as string[]) || [],
        callbackFn: async ({ resource: pickedResource }: { resource: Resource }) => {
          const { downloadURL: url } = await webdav.getFileInfo(currentSpace, pickedResource, {
            davProperties: [DavProperty.DownloadURL]
          })
          const values: Record<string, unknown> = { url }
          if (callback === 'Action_CompareDocuments') {
            values.filename = pickedResource.name
          }
          postMessageToCollabora(callback, values)
        }
      }),
      focusTrapInitial: false
    })
  }

  function handleUiPickLink(): void {
    const currentResource = unref(resource)

    dispatchModal({
      elementClass: 'file-picker-modal',
      title: $gettext('Pick a file to link'),
      customComponent: markRaw(FilePickerModal),
      hideActions: true,
      customComponentAttrs: () => ({
        parentFolderLink: getParentFolderLink(currentResource),
        allowedFileTypes: [],
        callbackFn: ({ resource: pickedResource }: { resource: Resource }) => {
          postMessageToCollabora('Action_InsertLink', {
            url: pickedResource.privateLink,
            text: pickedResource.name
          })
        }
      }),
      focusTrapInitial: false
    })
  }

  async function handleUiMention(message: CollaboraMessage): Promise<void> {
    if (message.Values?.type === 'autocomplete') {
      await handleMentionAutocomplete((message.Values.text as string) || '')
      return
    }
    if (message.Values?.type === 'selected' && typeof message.Values.username === 'string') {
      handleMentionSelected(message.Values.username)
    }
  }

  async function handleMentionAutocomplete(text: string): Promise<void> {
    if (loadSharesTask.isRunning) {
      loadSharesTask.cancelAll()
    }

    if (!unref(collaboratorsFetched)) {
      const { collaboratorShares } = await loadSharesTask.perform({
        space: unref(space),
        resource: unref(resource),
        updateStore: false
      })
      // dedupe by user id (a user can be space member and share recipient)
      collaborators.value = collaboratorShares.filter(
        (share, index, self) =>
          index === self.findIndex((s) => s.sharedWith.id === share.sharedWith.id)
      )
      collaboratorsFetched.value = true
    }

    if (!unref(collaborators).length) {
      return
    }

    const searchText = text.toLowerCase()
    const individualShareTypeValues = ShareTypes.individuals.map((t) => t.value)

    const list = unref(collaborators)
      .filter(
        (m) =>
          individualShareTypeValues.includes(m.shareType) &&
          m.sharedWith.id &&
          m.sharedWith.displayName?.toLowerCase().includes(searchText)
      )
      .map((m) => ({
        username: m.sharedWith.id,
        // Collabora expects a URL for the profile, which we don't have
        // hence use the URL for the current document
        profile: urlJoin(configStore.serverUrl, 'f', unref(resource).id),
        label: m.sharedWith.displayName || m.sharedWith.id
      }))

    postMessageToCollabora('Action_Mention', { list })
  }

  function handleMentionSelected(userId: string): void {
    if (!unref(userIdsToMention).includes(userId)) {
      userIdsToMention.value.push(userId)
    }
  }

  async function notifyMentionedUsers(): Promise<void> {
    if (unref(userIdsToMention).length === 0) {
      return
    }

    const fileID = unref(resource).fileId
    const userIDs = unref(userIdsToMention)
    userIdsToMention.value = []
    try {
      await httpAuthenticated.post(urlJoin(configStore.serverUrl, 'collaboration/notify'), {
        fileID,
        userIDs,
        type: 'mention'
      })
    } catch (e) {
      console.error('Error notifying mentioned users', e)
    }
  }

  function resetMentionState(): void {
    if (loadSharesTask.isRunning) {
      loadSharesTask.cancelAll()
    }
    collaborators.value = []
    collaboratorsFetched.value = false
  }

  sharesStore.$onAction(({ after, name }) => {
    after(() => {
      // when shares are added/removed while the app is open (via right sidebar),
      // we need to update the list of collaborators for mentions in Collabora
      if (['addShare', 'removeShare'].includes(name)) {
        collaboratorsFetched.value = false
      }
    })
  })

  function handleWindowBeforeUnload(): void {
    notifyMentionedUsers()
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleWindowBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleWindowBeforeUnload)
    notifyMentionedUsers()
  })

  async function handlePostMessagesCollabora(event: MessageEvent): Promise<void> {
    try {
      const message: CollaboraMessage = JSON.parse(event.data || '{}')

      switch (message.MessageId) {
        case 'App_LoadingStatus':
          handleAppLoadingStatus(message)
          break
        case 'Doc_ModifiedStatus':
          handleDocModifiedStatus(message)
          break
        case 'UI_Close':
          handleUiClose()
          break
        case 'UI_SaveAs':
          handleUiSaveAs(message)
          break
        case 'Action_Save_Resp':
          await handleActionSaveResp(message)
          break
        case 'UI_InsertGraphic':
          handleUiInsertGraphic()
          break
        case 'UI_InsertFile':
          handleUiInsertFile(message)
          break
        case 'UI_Mention':
          await handleUiMention(message)
          break
        case 'UI_PickLink':
          handleUiPickLink()
          break
      }
    } catch (e) {
      console.debug('Error parsing Collabora PostMessage', e)
    }
  }

  return {
    handlePostMessagesCollabora,
    resetMentionState
  }
}
