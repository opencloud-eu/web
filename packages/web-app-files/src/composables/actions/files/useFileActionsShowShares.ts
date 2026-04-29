import { ShareResource } from '@opencloud-eu/web-client'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FileAction,
  FileActionOptionsWithEvent,
  isLocationTrashActive,
  useCanShare,
  useInterceptModifierClick,
  useRouter,
  useSideBar
} from '@opencloud-eu/web-pkg'

export const useFileActionsShowShares = () => {
  const router = useRouter()
  const { $gettext } = useGettext()
  const { canShare } = useCanShare()
  const { openSideBarPanel } = useSideBar()
  const { interceptModifierClick } = useInterceptModifierClick()

  const handler = ({ resources, event }: FileActionOptionsWithEvent) => {
    const resource = resources[0]

    if (event && interceptModifierClick(event, resource)) {
      return
    }

    openSideBarPanel('sharing')
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
