import {
  ApplicationInformation,
  Extension,
  FloatingActionButtonExtension,
  isLocationPublicActive,
  isLocationSpacesActive,
  useCapabilityStore,
  useConfigStore,
  useResourcesStore,
  useRouter,
  useSearch,
  useSpaceActionsCreate,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed, markRaw, unref } from 'vue'
import { SDKSearch } from './search'
import { useSideBarPanels } from './composables/extensions/useFileSideBars'
import { useFolderViews } from './composables/extensions/useFolderViews'
import { useVaultIndicator } from './composables/extensions/useVaultIndicator'
import { useFileActions } from './composables/extensions/useFileActions'
import { useSpaceActions } from './composables/extensions/useSpaceActions'
import { useUploadActions } from './composables/extensions/useUploadActions'
import { isPublicSpaceResource, SharePermissionBit, urlJoin } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import CreateOrUploadMenu from './components/CreateOrUploadMenu.vue'
import { APPID } from './appid'

export const extensions = (appInfo: ApplicationInformation) => {
  const capabilityStore = useCapabilityStore()
  const configStore = useConfigStore()
  const userStore = useUserStore()
  const { currentFolder } = storeToRefs(useResourcesStore())
  const { currentSpace } = storeToRefs(useSpacesStore())
  const router = useRouter()
  const { search: searchFunction } = useSearch()
  const { $gettext } = useGettext()

  const { actions: createSpaceActions } = useSpaceActionsCreate()
  const createSpaceAction = computed(() => unref(createSpaceActions)[0])

  const fileActionExtensions = useFileActions()
  const spaceActionExtensions = useSpaceActions()
  const uploadActionExtensions = useUploadActions()
  const folderViewExtensions = useFolderViews()
  const sideBarPanelExtensions = useSideBarPanels()
  const vaultIndicator = useVaultIndicator()

  return computed<Extension[]>(() => [
    ...fileActionExtensions,
    ...spaceActionExtensions,
    ...uploadActionExtensions,
    ...folderViewExtensions,
    ...sideBarPanelExtensions,
    vaultIndicator,
    {
      id: 'com.github.opencloud-eu.web.files.search',
      extensionPointIds: ['app.search.provider'],
      type: 'search',
      searchProvider: new SDKSearch(capabilityStore, searchFunction, configStore)
    },
    {
      id: `com.github.opencloud-eu.web.${APPID}.floating-action-button`,
      extensionPointIds: ['app.files.floating-action-button'],
      type: 'floatingActionButton',
      icon: 'add',
      label: () => $gettext('New'),
      handler: () => {
        if (isLocationSpacesActive(router, 'files-spaces-projects')) {
          return unref(createSpaceAction).handler()
        }
      },
      isDisabled: () => {
        if (
          isLocationSpacesActive(router, 'files-spaces-projects') &&
          unref(createSpaceAction).isVisible()
        ) {
          return false
        }

        // permission checks on the space are preferred over the current folder,
        // as the current folder resets on every navigation, causing a button flicker.
        const space = unref(currentSpace)
        if (space) {
          if (!isPublicSpaceResource(space)) {
            return space.canUpload({ user: userStore.user }) !== true
          }
          // public spaces have no graph permissions, check link permission
          if (space.publicLinkPermission !== undefined) {
            return !(space.publicLinkPermission & SharePermissionBit.Create)
          }
        }

        return !unref(currentFolder)?.canUpload({ user: userStore.user })
      },
      mode: () => {
        if (isLocationSpacesActive(router, 'files-spaces-projects')) {
          return 'handler'
        }

        return 'drop'
      },
      isVisible: () => {
        if (isLocationPublicActive(router, 'files-public-upload')) {
          return false
        }

        return true
      },
      dropComponent: markRaw(CreateOrUploadMenu)
    } as FloatingActionButtonExtension,
    ...((userStore.user && [
      {
        id: `app.${appInfo.id}.menuItem`,
        type: 'appMenuItem',
        label: () => appInfo.name,
        color: appInfo.color,
        icon: appInfo.icon,
        priority: 10,
        path: urlJoin(appInfo.id)
      }
    ]) ||
      [])
  ])
}
