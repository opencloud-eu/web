import {
  ApplicationInformation,
  Extension,
  FloatingActionButtonExtension,
  isLocationSpacesActive,
  useCapabilityStore,
  useConfigStore,
  useIsFilesAppActive,
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
import { useTrashActions } from './composables/extensions/useTrashActions'
import { urlJoin } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import CreateOrUploadMenu from './components/CreateOrUploadMenu.vue'

export const extensions = (appInfo: ApplicationInformation) => {
  const capabilityStore = useCapabilityStore()
  const configStore = useConfigStore()
  const userStore = useUserStore()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const router = useRouter()
  const { search: searchFunction } = useSearch()
  const { $gettext } = useGettext()
  const isFilesAppActive = useIsFilesAppActive()

  const { actions: createSpaceActions } = useSpaceActionsCreate()
  const createSpaceAction = computed(() => unref(createSpaceActions)[0])

  const fileActionExtensions = useFileActions()
  const trashActionExtensions = useTrashActions()
  const folderViewExtensions = useFolderViews()
  const sideBarPanelExtensions = useSideBarPanels()

  return computed<Extension[]>(() => [
    ...fileActionExtensions,
    ...trashActionExtensions,
    ...folderViewExtensions,
    ...sideBarPanelExtensions,
    {
      id: 'com.github.opencloud-eu.web.files.search',
      extensionPointIds: ['app.search.provider'],
      type: 'search',
      searchProvider: new SDKSearch(capabilityStore, router, searchFunction, configStore)
    },
    {
      id: 'com.github.opencloud-eu.web.files.floating-action-button',
      extensionPointIds: ['global.floating-action-button'],
      type: 'floatingActionButton',
      icon: 'add',
      label: () => $gettext('New'),
      isActive: () => {
        return unref(isFilesAppActive)
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

        return !unref(currentFolder)?.canUpload({ user: userStore.user })
      },
      mode: () => {
        if (isLocationSpacesActive(router, 'files-spaces-projects')) {
          return 'handler'
        }

        return 'drop'
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
