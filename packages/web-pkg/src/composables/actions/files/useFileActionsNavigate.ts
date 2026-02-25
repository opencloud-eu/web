import { createFileRouteOptions, isSameResource } from '../../../helpers'
import {
  createLocationPublic,
  createLocationSpaces,
  createLocationTrash,
  isLocationPublicActive,
  isLocationTrashActive
} from '../../../router'
import merge from 'lodash-es/merge'
import { useRouter } from '../../router'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FileAction } from '../types'
import { useResourcesStore } from '../../piniaStores'
import { storeToRefs } from 'pinia'
import { isTrashResource } from '@opencloud-eu/web-client'

export const useFileActionsNavigate = () => {
  const router = useRouter()
  const { $gettext } = useGettext()

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  const routeName = computed(() => {
    if (isLocationPublicActive(router, 'files-public-link')) {
      return createLocationPublic('files-public-link')
    }
    if (isLocationTrashActive(router, 'files-trash-overview')) {
      return createLocationTrash('files-trash-generic')
    }

    return createLocationSpaces('files-spaces-generic')
  })

  const actions = computed((): FileAction[] => [
    {
      name: 'navigate',
      icon: 'folder-open',
      label: () => $gettext('Navigate'),
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }
        if (unref(currentFolder) !== null && isSameResource(resources[0], unref(currentFolder))) {
          // edge case: current folder breadcrumb menu is not supposed to show the navigate action for itself
          return false
        }
        if (isTrashResource(resources[0])) {
          return false
        }
        return resources[0].isFolder || resources[0].type === 'space'
      },
      route: ({ space, resources }) => {
        return merge(
          {},
          unref(routeName),
          createFileRouteOptions(space, {
            path: resources[0].path,
            fileId: resources[0].fileId
          })
        )
      },
      class: 'oc-files-actions-navigate-trigger'
    }
  ])

  return {
    actions
  }
}
