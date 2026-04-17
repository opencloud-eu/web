import { FolderViewExtension, ResourceTable, ResourceTiles } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import {
  folderViewsFavoritesExtensionPoint,
  folderViewsFolderExtensionPoint,
  folderViewsProjectSpacesExtensionPoint,
  folderViewsSharedViaLinkExtensionPoint,
  folderViewsSharedWithMeExtensionPoint,
  folderViewsSharedWithOthersExtensionPoint,
  folderViewsSearchExtensionPoint,
  folderViewsTrashExtensionPoint,
  folderViewsTrashOverviewExtensionPoint
} from '../../extensionPoints'

export const useFolderViews = (): FolderViewExtension[] => {
  const { $gettext } = useGettext()

  return [
    {
      id: 'com.github.opencloud-eu.web.files.folder-view.resource-table-condensed',
      type: 'folderView',
      extensionPointIds: [
        folderViewsFolderExtensionPoint.id,
        folderViewsFavoritesExtensionPoint.id,
        folderViewsTrashExtensionPoint.id,
        folderViewsTrashOverviewExtensionPoint.id,
        folderViewsProjectSpacesExtensionPoint.id,
        folderViewsSharedWithMeExtensionPoint.id,
        folderViewsSharedViaLinkExtensionPoint.id,
        folderViewsSharedWithOthersExtensionPoint.id,
        folderViewsSearchExtensionPoint.id
      ],
      folderView: {
        name: 'resource-table-condensed',
        label: $gettext('Condensed table view'),
        icon: {
          name: 'menu-line-condensed',
          fillType: 'none'
        },
        component: ResourceTable
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.folder-view.resource-table',
      type: 'folderView',
      extensionPointIds: [
        folderViewsFolderExtensionPoint.id,
        folderViewsProjectSpacesExtensionPoint.id,
        folderViewsFavoritesExtensionPoint.id,
        folderViewsTrashExtensionPoint.id,
        folderViewsTrashOverviewExtensionPoint.id,
        folderViewsSharedWithMeExtensionPoint.id,
        folderViewsSharedViaLinkExtensionPoint.id,
        folderViewsSharedWithOthersExtensionPoint.id,
        folderViewsSearchExtensionPoint.id
      ],
      folderView: {
        name: 'resource-table',
        label: $gettext('Default table view'),
        icon: {
          name: 'list-unordered',
          fillType: 'none'
        },
        component: ResourceTable
      }
    },
    {
      id: 'com.github.opencloud-eu.web.files.folder-view.resource-tiles',
      type: 'folderView',
      extensionPointIds: [
        folderViewsFolderExtensionPoint.id,
        folderViewsProjectSpacesExtensionPoint.id,
        folderViewsFavoritesExtensionPoint.id,
        folderViewsTrashExtensionPoint.id,
        folderViewsTrashOverviewExtensionPoint.id,
        folderViewsSharedWithMeExtensionPoint.id,
        folderViewsSharedViaLinkExtensionPoint.id,
        folderViewsSharedWithOthersExtensionPoint.id,
        folderViewsSearchExtensionPoint.id
      ],
      folderView: {
        name: 'resource-tiles',
        label: $gettext('Tiles view'),
        icon: {
          name: 'gallery-view-2',
          fillType: 'none'
        },
        component: ResourceTiles
      }
    }
  ]
}
