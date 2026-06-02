import { extractNameWithoutExtension, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { storeToRefs } from 'pinia'
import { join } from 'path'
import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  ApplicationFileExtension,
  decryptResourceInPlace,
  FileAction,
  FileActionOptions,
  resolveFileNameDuplicate,
  resolveFolderVault,
  streamToArrayBuffer,
  useAppsStore,
  useClientService,
  useEmbedMode,
  useExtensionRegistry,
  useFileActions,
  useIsResourceNameValid,
  useMessages,
  useModals,
  useResourcesStore,
  useRouter,
  useUserStore
} from '@opencloud-eu/web-pkg'

export const useFileActionsCreateNewFile = ({ space }: { space?: Ref<SpaceResource> } = {}) => {
  const { showMessage, showErrorMessage } = useMessages()
  const userStore = useUserStore()
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()
  const appsStore = useAppsStore()
  const { isEnabled: isEmbedModeEnabled } = useEmbedMode()

  const { openEditor } = useFileActions()
  const clientService = useClientService()
  const router = useRouter()

  const resourcesStore = useResourcesStore()
  const { resources, currentFolder, areFileExtensionsShown } = storeToRefs(resourcesStore)
  const extensionRegistry = useExtensionRegistry()

  const { isFileNameValid } = useIsResourceNameValid()

  const appNewFileMenuExtensions = computed(() =>
    appsStore.fileExtensions.filter(({ newFileMenu }) => !!newFileMenu)
  )

  const openFile = (resource: Resource, appFileExtension: ApplicationFileExtension) => {
    resourcesStore.upsertResource(resource)

    // Folder-typed new-menu entries (e.g. vault from rclone-crypt, notebooks
    // from notes) may not register an editor route — when there's nothing to
    // open we navigate into the freshly-created folder instead so the user
    // ends up inside it. Anything that *does* have a route (apps like notes)
    // keeps using openEditor.
    const targetSpace = unref(space)
    const routeName = appFileExtension?.routeName || appFileExtension?.app
    if (appFileExtension?.type === 'folder' && !router.hasRoute(routeName)) {
      const driveAliasAndItem = targetSpace?.getDriveAliasAndItem(resource)
      if (driveAliasAndItem) {
        router.push({
          name: 'files-spaces-generic',
          params: { driveAliasAndItem },
          query: resource.fileId ? { fileId: resource.fileId } : undefined
        })
        return
      }
    }

    return openEditor(appFileExtension, targetSpace, resource)
  }

  const handler = (
    fileActionOptions: FileActionOptions,
    extension: string,
    appFileExtension: ApplicationFileExtension
  ) => {
    let defaultName = $gettext('New file') + `.${extension}`

    if (unref(resources).some((f) => f.name === defaultName)) {
      defaultName = resolveFileNameDuplicate(defaultName, extension, unref(resources))
    }

    if (!areFileExtensionsShown.value) {
      defaultName = extractNameWithoutExtension({ name: defaultName, extension } as Resource)
    }

    const inputSelectionRange = !areFileExtensionsShown.value
      ? null
      : ([0, defaultName.length - (extension.length + 1)] as [number, number])

    dispatchModal({
      title: $gettext('Create a new file'),
      confirmText: $gettext('Create'),
      hasInput: true,
      inputValue: defaultName,
      inputLabel: $gettext('File name'),
      inputRequiredMark: true,
      inputSelectionRange,
      onConfirm: async (fileName: string) => {
        if (!areFileExtensionsShown.value) {
          fileName = `${fileName}.${extension}`
        }

        try {
          let resource: Resource
          // Vault-aware: the picker/modal works in cleartext (what the user
          // sees in the listing), but webdav needs the encrypted segment
          // names. Look up the engine for the parent and translate before
          // calling out — then decrypt the response so the upserted resource
          // matches the rest of the (cleartext) listing.
          const cleartextParentPath = unref(currentFolder).path
          const vaultEngine = resolveFolderVault(
            extensionRegistry,
            unref(space),
            cleartextParentPath
          )
          if (appFileExtension.createFileHandler) {
            resource = await appFileExtension.createFileHandler({
              fileName,
              space: unref(space),
              currentFolder: unref(currentFolder)
            })
          } else if (appFileExtension.type === 'folder') {
            const cleartextPath = join(cleartextParentPath, fileName)
            const path = vaultEngine ? await vaultEngine.encryptPath(cleartextPath) : cleartextPath
            resource = await (clientService.webdav as WebDAV).createFolder(unref(space), { path })
          } else {
            const cleartextPath = join(cleartextParentPath, fileName)
            const path = vaultEngine ? await vaultEngine.encryptPath(cleartextPath) : cleartextPath
            // In a vault, "create empty file" must still produce a valid
            // rclone-crypt blob on the server — a 0-byte PUT would have no
            // header and refuse to decrypt later. Pipe an empty plaintext
            // stream through encryptContent to get the file-header bytes.
            const content = vaultEngine
              ? await streamToArrayBuffer(vaultEngine.encryptContent(new Blob([]).stream()))
              : undefined
            resource = await (clientService.webdav as WebDAV).putFileContents(unref(space), {
              path,
              ...(content ? { content } : {})
            })
          }
          if (vaultEngine && resource) {
            await decryptResourceInPlace(vaultEngine, resource)
          }

          resourcesStore.upsertResource(resource)

          showMessage({
            title: $gettext('»%{fileName}« was created successfully', { fileName: resource.name })
          })

          if (unref(isEmbedModeEnabled)) {
            return
          }

          return openFile(resource, appFileExtension)
        } catch (error) {
          console.error(error)
          showErrorMessage({
            title: $gettext('Failed to create file'),
            errors: [error]
          })
        }
      },
      onInput: (name: string, setError: (error: string) => void) => {
        const newFileName = areFileExtensionsShown.value ? name : `${name}.${extension}`
        const resource = {
          path: join(unref(currentFolder).path, newFileName),
          name: newFileName,
          extension
        } as Resource
        const { isValid, error } = isFileNameValid(resource, newFileName)
        setError(isValid ? null : error)
      }
    })
  }

  const actions = computed((): FileAction[] => {
    const actions: FileAction[] = []
    // make sure there is only one action for a file extension/mime-type
    // if there are
    // - multiple ApplicationFileExtensions with priority
    // or
    // - multiple ApplicationFileExtensions without priority (and none with)
    // we do not guarantee which one is chosen
    const defaultMapping: Record<string, ApplicationFileExtension> = {}
    for (const appFileExtension of unref(appNewFileMenuExtensions) || []) {
      if (appFileExtension.hasPriority) {
        defaultMapping[appFileExtension.extension] = appFileExtension
      } else {
        defaultMapping[appFileExtension.extension] =
          defaultMapping[appFileExtension.extension] || appFileExtension
      }
    }

    for (const [, appFileExtension] of Object.entries(defaultMapping)) {
      actions.push({
        name: 'create-new-file',
        icon: 'add',
        handler: (args) => handler(args, appFileExtension.extension, appFileExtension),
        label: () => $gettext(appFileExtension.newFileMenu.menuTitle()),
        isVisible: () => {
          return unref(currentFolder)?.canUpload({ user: userStore.user })
        },
        class: 'oc-files-actions-create-new-file',
        ext: appFileExtension.extension,
        isExternal: appFileExtension.app?.startsWith('external-')
      })
    }

    return actions
  })

  return {
    actions,
    openFile
  }
}
