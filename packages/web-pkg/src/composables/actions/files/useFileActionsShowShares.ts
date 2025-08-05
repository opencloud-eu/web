import { isLocationTrashActive } from '../../../router'
import { ShareResource } from '@opencloud-eu/web-client'
import { eventBus } from '../../../services'
import { SideBarEventTopics } from '../../sideBar'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useRouter } from '../../router'
import { FileAction } from '../types'
import { FileActionOptionsWithEvent } from './useFileActions'
import { useCanShare } from '../../shares'
import { useResourcesStore } from '../../piniaStores'
import { useInterceptModifierClick } from '../../keyboardActions'

export const useFileActionsShowShares = () => {
  const router = useRouter()
  const { $gettext } = useGettext()
  const { canShare } = useCanShare()
  const resourcesStore = useResourcesStore()

  const handler = ({ resources, event }: FileActionOptionsWithEvent & { event?: MouseEvent }) => {
    const resource = resources[0]
    const { interceptModifierClick } = useInterceptModifierClick()

    if (event && interceptModifierClick(event, resource)) {
      return
    }

    eventBus.publish(SideBarEventTopics.openWithPanel, 'sharing#peopleShares')
  }

  const actions = computed((): FileAction<ShareResource>[] => [
    {
      name: 'show-shares',
      icon: 'user-add',
      label: () => $gettext('Share'),
      handler,
      isVisible: ({ space, resources }) => {
        if (isLocationTrashActive(router, 'files-trash-generic')) {
          return false
        }
        if (resources.length !== 1) {
          return false
        }
        return canShare({ space, resource: resources[0] })
      },
      class: 'oc-files-actions-show-shares-trigger'
    }
  ])

  return {
    actions
  }
}
