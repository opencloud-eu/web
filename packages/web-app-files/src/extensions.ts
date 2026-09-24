import {
  ApplicationInformation,
  Extension,
  FloatingActionButtonExtension,
  isLocationCommonActive,
  isLocationPublicActive,
  isLocationSharesActive,
  isLocationSpacesActive,
  isLocationTrashActive,
  useCapabilityStore,
  useConfigStore,
  useResourcesStore,
  useRouter,
  useSearch,
  useSpacesStore,
  useUserStore,
  useAbility
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
import { useSpaceActionsCreate } from './composables/actions/spaces/useSpaceActionsCreate'
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
  const { can } = useAbility()

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
      tooltip: () => {
        if (isLocationSpacesActive(router, 'files-spaces-projects')) {
          if (!can('create-all', 'Drive')) {
            return $gettext('Creating Spaces requires additional permissions')
          }
          return
        }

        if (isLocationSharesActive(router, 'files-shares-with-me')) {
          return $gettext('To create or upload files, switch to Personal or a Space')
        }

        if (isLocationSharesActive(router, 'files-shares-with-others')) {
          return $gettext('To share a file or folder, open its Shares panel and invite people')
        }

        if (isLocationSharesActive(router, 'files-shares-via-link')) {
          return $gettext('To create a link, open the Shares panel of a file or folder')
        }

        if (isLocationCommonActive(router, 'files-common-favorites')) {
          return $gettext(
            'To add a favorite, open the context menu of a file or folder and select "Add to favorites"'
          )
        }

        if (isLocationCommonActive(router, 'files-common-search')) {
          return $gettext('To create or upload files, open a folder or Space')
        }

        if (isLocationTrashActive(router)) {
          return $gettext('To create or upload files, switch to Personal or a Space')
        }
      },
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

        if (isLocationTrashActive(router, 'files-trash-generic')) {
          return true
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
