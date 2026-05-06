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
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed, unref } from 'vue'
import { SDKSearch } from './search'
import { useSideBarPanels } from './composables/extensions/useFileSideBars'
import { useFolderViews } from './composables/extensions/useFolderViews'
import { useFileActions } from './composables/extensions/useFileActions'
import { useSpaceActions } from './composables/extensions/useSpaceActions'
import { useTrashActions } from './composables/extensions/useTrashActions'
import { useUploadActions } from './composables/extensions/useUploadActions'
import { urlJoin } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import CreateOrUploadMenu from './components/CreateOrUploadMenu.vue'
import { APPID } from './appid'

export const extensions = (appInfo: ApplicationInformation) => {
  const capabilityStore = useCapabilityStore()
  const configStore = useConfigStore()
  const userStore = useUserStore()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const router = useRouter()
  const { search: searchFunction } = useSearch()
  const { $gettext } = useGettext()

  const { actions: createSpaceActions } = useSpaceActionsCreate()
  const createSpaceAction = computed(() => unref(createSpaceActions)[0])

  const fileActionExtensions = useFileActions()
  const spaceActionExtensions = useSpaceActions()
  const trashActionExtensions = useTrashActions()
  const uploadActionExtensions = useUploadActions()
  const folderViewExtensions = useFolderViews()
  const sideBarPanelExtensions = useSideBarPanels()

  return computed<Extension[]>(() => [
    ...fileActionExtensions,
    ...spaceActionExtensions,
    ...trashActionExtensions,
    ...uploadActionExtensions,
    ...folderViewExtensions,
    ...sideBarPanelExtensions,
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
      dropComponent: CreateOrUploadMenu
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
