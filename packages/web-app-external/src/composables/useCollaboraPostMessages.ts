import { onMounted, onBeforeUnmount, unref, type Ref, markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import { dirname, join, relative } from 'path'
import {
  extractExtensionFromFile,
  extractNameWithoutExtension,
  Resource,
  SpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { DavProperty } from '@opencloud-eu/web-client/webdav'
import {
  useRoute,
  useRouter,
  useClientService,
  useModals,
  useFolderLink,
  useMentionUsers,
  useConfigStore,
  useMessages,
  resolveFileNameDuplicate,
  FilePickerModal,
  LocationPickerModal,
  isMessageFromIframe
} from '@opencloud-eu/web-pkg'

interface CollaboraMessage {
  MessageId: string
  Values?: Record<string, unknown>
}

export function useCollaboraPostMessages({
  space,
  resource,
  appIframeRef,
  onClose
}: {
  space: Ref<SpaceResource>
  resource: Ref<Resource>
  appIframeRef: Ref<HTMLIFrameElement | null>
  onClose: () => void
}) {
  const { $gettext } = useGettext()
  const route = useRoute()
  const router = useRouter()
  const { webdav } = useClientService()
  const { dispatchModal } = useModals()
  const { showErrorMessage } = useMessages()
  const { getParentFolderLink } = useFolderLink()
  const configStore = useConfigStore()
  const {
    getMentionUsers,
    notifyMentionedUsers,
    selectMentionUser: handleMentionSelected
  } = useMentionUsers({ space, resource })

  const mentionLabels = new Map<string, string>()

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
    onClose()
  }

  function handleUiSaveAs(message: CollaboraMessage): void {
    const currentResource = unref(resource)
    const format = message.Values?.format as string | undefined

    dispatchModal({
      elementClass: 'location-picker-modal',
      title: format
        ? $gettext('Export »%{name}« as %{format}', { name: currentResource.name, format })
        : $gettext('Save »%{name}« as', { name: currentResource.name }),
      customComponent: markRaw(LocationPickerModal),
      hideActions: true,
      customComponentAttrs: () => ({
        parentFolderLink: getParentFolderLink(currentResource),
        submitButtonTitle: format ? $gettext('Export') : $gettext('Save'),
        chooseFileName: true,
        chooseFileNameSuggestion: format
          ? `${extractNameWithoutExtension(currentResource)}.${format}`
          : currentResource.name,
        callbackFn: ([targetFolder]: Resource[], { fileName }: { fileName?: string }) =>
          saveAs(targetFolder, fileName)
      }),
      focusTrapInitial: false
    })
  }

  async function saveAs(targetFolder: Resource, fileName: string): Promise<void> {
    const currentResource = unref(resource)
    const errorTitle = $gettext('Unable to save »%{fileName}«', { fileName })

    // Collabora saves relative to the folder of the current file and can't leave it
    const targetPath = relative(dirname(currentResource.path), targetFolder.path)
    if (
      targetFolder.storageId !== currentResource.storageId ||
      targetPath === '..' ||
      targetPath.startsWith('../')
    ) {
      showErrorMessage({
        title: errorTitle,
        desc: $gettext('Documents can only be saved in the current folder or its subfolders.')
      })
      return
    }

    try {
      // an existing file can't be overwritten, so pick a free name like the file list does
      const { children } = await webdav.listFiles(unref(space), targetFolder, {
        davProperties: [DavProperty.Name]
      })
      if (children.some(({ name }) => name === fileName)) {
        const extension = extractExtensionFromFile({ name: fileName } as Resource)
        fileName = resolveFileNameDuplicate(fileName, extension, children)
      }
    } catch (e) {
      console.error(e)
      showErrorMessage({ title: errorTitle, errors: [e] })
      return
    }

    postMessageToCollabora('Action_SaveAs', { Filename: join(targetPath, fileName), Notify: true })
  }

  async function handleActionSaveResp(message: CollaboraMessage): Promise<void> {
    if (!message.Values?.fileName) {
      return
    }

    const currentResource = unref(resource)
    const currentSpace = unref(space)

    // FIXME: when we move to id based propfinds we magically need a fileId for the new file. Collabora doesn't provide that.
    // the file name is relative to the folder of the current file and may contain subfolders
    const newFile = await webdav.getFileInfo(currentSpace, {
      path: join(dirname(currentResource.path), message.Values.fileName as string),
      fileId: undefined
    })
    await router.push({
      name: unref(route).name,
      params: {
        ...unref(route).params,
        driveAliasAndItem: currentSpace.getDriveAliasAndItem(newFile)
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
      const id = message.Values.username
      handleMentionSelected({ id, label: mentionLabels.get(id) ?? id })
    }
  }

  async function handleMentionAutocomplete(text: string): Promise<void> {
    const mentionUsers = await getMentionUsers(text)
    for (const { id, label } of mentionUsers) {
      mentionLabels.set(id, label)
    }

    const list = mentionUsers.map(({ id, label }) => ({
      username: id,
      // Collabora expects a URL for the profile, which we don't have
      // hence use the URL for the current document
      profile: urlJoin(configStore.serverUrl, 'f', unref(resource).id),
      label
    }))

    postMessageToCollabora('Action_Mention', { list })
  }

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
    if (!isMessageFromIframe(event, unref(appIframeRef))) {
      return
    }

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
    handlePostMessagesCollabora
  }
}
