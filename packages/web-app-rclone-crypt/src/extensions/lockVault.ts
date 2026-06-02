import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  ActionExtension,
  FileAction,
  FileActionOptions,
  useFolderVaultStore,
  useMessages,
  useRouter
} from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'

function isVaultRoot(resource: Resource | undefined): boolean {
  if (!resource) return false
  if (resource.type !== 'folder' && !resource.isFolder) return false
  return resource.name?.endsWith('.vault') === true
}

export const useLockVaultAction = (): Ref<FileAction> => {
  const { $gettext } = useGettext()
  const vaultStore = useFolderVaultStore()
  const { showMessage } = useMessages()
  const router = useRouter()

  return computed(() => ({
    name: 'lock-vault',
    icon: 'lock',
    iconFillType: 'line',
    label: () => $gettext('Lock vault'),
    category: 'tertiary',
    handler: ({ resources }: FileActionOptions) => {
      const resource = resources?.[0]
      if (!resource || !isVaultRoot(resource) || !resource.storageId) return
      const spaceId = resource.storageId
      const vaultRoot = resource.path
      vaultStore.clearSecret(spaceId, vaultRoot)
      showMessage({
        title: $gettext('»%{vault}« was locked', { vault: resource.name })
      })
      // If the user happens to be sitting inside the freshly-locked vault,
      // bounce them to the parent so they aren't staring at encrypted
      // ciphertext names. From outside (clicked on the vault entry in the
      // parent listing) the current route is fine — no redirect needed.
      const currentPath =
        (unref(router.currentRoute).params?.driveAliasAndItem as string | undefined) || ''
      if (currentPath.includes(vaultRoot.replace(/^\//, ''))) {
        const parent = vaultRoot.replace(/\/[^/]+$/, '') || '/'
        router.push(`/files/spaces/${currentPath.split('/')[0]}${parent === '/' ? '' : parent}`)
      }
    },
    isVisible: ({ resources }: FileActionOptions) => {
      const resource = resources?.[0]
      if (!resource || !isVaultRoot(resource) || !resource.storageId) return false
      return vaultStore.isUnlocked(resource.storageId, resource.path)
    },
    class: 'oc-files-actions-lock-vault'
  }))
}

export function lockVaultActionExtension(action: Ref<FileAction>): ActionExtension {
  return {
    id: 'app.rclone-crypt.lock-vault',
    type: 'action',
    // String literal matches `contextActionsExtensionPoint.id` in web-app-files
    // — see other plugins that hook the same point.
    extensionPointIds: ['global.files.context-actions'],
    get action() {
      return unref(action)
    }
  } as ActionExtension
}

export const useUnlockVaultAction = (): Ref<FileAction> => {
  const { $gettext } = useGettext()
  const vaultStore = useFolderVaultStore()
  const router = useRouter()

  return computed(() => ({
    name: 'unlock-vault',
    icon: 'lock-unlock',
    iconFillType: 'line',
    label: () => $gettext('Unlock vault'),
    category: 'tertiary',
    handler: ({ resources }: FileActionOptions) => {
      const resource = resources?.[0]
      if (!resource || !isVaultRoot(resource) || !resource.storageId) return
      // Send the user through the unlock screen but bring them back to the
      // current (parent) location, not into the vault. That keeps the
      // surrounding listing in view — the vault entry just flips from locked
      // to unlocked. Mirror image of the lock action.
      const back = unref(router.currentRoute).fullPath
      router.push({
        name: 'rclone-crypt-unlock',
        query: {
          spaceId: resource.storageId,
          vaultRoot: resource.path,
          redirectUrl: back
        }
      })
    },
    isVisible: ({ resources }: FileActionOptions) => {
      const resource = resources?.[0]
      if (!resource || !isVaultRoot(resource) || !resource.storageId) return false
      return !vaultStore.isUnlocked(resource.storageId, resource.path)
    },
    class: 'oc-files-actions-unlock-vault'
  }))
}

export function unlockVaultActionExtension(action: Ref<FileAction>): ActionExtension {
  return {
    id: 'app.rclone-crypt.unlock-vault',
    type: 'action',
    extensionPointIds: ['global.files.context-actions'],
    get action() {
      return unref(action)
    }
  } as ActionExtension
}
