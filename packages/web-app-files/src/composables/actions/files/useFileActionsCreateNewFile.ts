import { extractNameWithoutExtension, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { storeToRefs } from 'pinia'
import { join } from 'path'
import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  ApplicationFileExtension,
  FileAction,
  FileActionOptions,
  markVaultStatus,
  resolveFileNameDuplicate,
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
    // from notes) may not register an editor route - when there's nothing to
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
    // Apps may override the default name shown in the create modal - e.g.
    // rclone-crypt wants "New vault.vault" instead of "New file.vault".
    // Fall back to the generic "New file" prefix when no override is set.
    const baseName = appFileExtension.newFileMenu?.defaultName?.() ?? $gettext('New file')
    let defaultName = `${baseName}.${extension}`

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
          if (appFileExtension.createFileHandler) {
            resource = await appFileExtension.createFileHandler({
              fileName,
              space: unref(space),
              currentFolder: unref(currentFolder)
            })
          } else if (appFileExtension.type === 'folder') {
            const path = join(unref(currentFolder).path, fileName)
            resource = await (clientService.webdav as WebDAV).createFolder(unref(space), { path })
          } else {
            const path = join(unref(currentFolder).path, fileName)
            resource = await (clientService.webdav as WebDAV).putFileContents(unref(space), {
              path
            })
          }

          markVaultStatus(extensionRegistry, unref(space), [resource])

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
      // Actions for external editor apps (Collabora, …) need to be disabled in vaults
      // because those apps load the file server-side via the WOPI bridge - they'd see the
      // encrypted blob, not the cleartext the user expects.
      const isExternalActionInVault =
        appFileExtension.app?.startsWith('external-') && unref(currentFolder)?.isInVault

      actions.push({
        name: 'create-new-file',
        icon: 'add',
        handler: (args) => handler(args, appFileExtension.extension, appFileExtension),
        label: () => $gettext(appFileExtension.newFileMenu.menuTitle()),
        isVisible: () => {
          if (!unref(currentFolder)?.canUpload({ user: userStore.user })) {
            return false
          }
          // No vault inside a vault: creating a ".vault" folder inside an
          // (already encrypted) vault just yields a confusingly named folder, not
          // a real nested vault, so hide that entry there.
          if (appFileExtension.extension === 'vault' && unref(currentFolder)?.isInVault) {
            return false
          }
          return true
        },
        isDisabled: () => {
          if (isExternalActionInVault) {
            return true
          }
          return false
        },
        disabledTooltip: () => {
          if (isExternalActionInVault) {
            return $gettext('This file type cannot be created inside vaults')
          }
          return undefined
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
