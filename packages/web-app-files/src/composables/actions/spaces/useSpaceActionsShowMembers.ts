import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  SpaceAction,
  SpaceActionOptions,
  useResourcesStore,
  useSideBar
} from '@opencloud-eu/web-pkg'
import { isProjectSpaceResource } from '@opencloud-eu/web-client'

export const useSpaceActionsShowMembers = () => {
  const { $gettext } = useGettext()
  const resourcesStore = useResourcesStore()
  const { openSideBarPanel } = useSideBar()

  const handler = ({ resources }: SpaceActionOptions) => {
    resourcesStore.setSelection(resources.map(({ id }) => id))
    openSideBarPanel('space-share')
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'show-members',
      icon: 'group',
      label: () => $gettext('Members'),
      handler,
      isVisible: ({ resources }) =>
        resources.length === 1 && isProjectSpaceResource(resources[0]) && !resources[0].disabled,
      class: 'oc-files-actions-show-details-trigger'
    }
  ])

  return {
    actions
  }
}
