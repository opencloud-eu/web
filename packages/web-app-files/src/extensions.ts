import {
  ApplicationInformation,
  Extension,
  useCapabilityStore,
  useConfigStore,
  useRouter,
  useSearch,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'
import { SDKSearch } from './search'
import { useSideBarPanels } from './composables/extensions/useFileSideBars'
import { useFolderViews } from './composables/extensions/useFolderViews'
import { useFileActions } from './composables/extensions/useFileActions'
import { useTrashActions } from './composables/extensions/useTrashActions'
import { urlJoin } from '@opencloud-eu/web-client'

export const extensions = (appInfo: ApplicationInformation) => {
  const capabilityStore = useCapabilityStore()
  const configStore = useConfigStore()
  const userStore = useUserStore()
  const router = useRouter()
  const { search: searchFunction } = useSearch()

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
