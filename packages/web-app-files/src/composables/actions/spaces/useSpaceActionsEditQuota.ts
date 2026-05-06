import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceResource, isProjectSpaceResource, isSpaceResource } from '@opencloud-eu/web-client'
import {
  QuotaModal,
  SpaceAction,
  SpaceActionOptions,
  useAbility,
  useModals
} from '@opencloud-eu/web-pkg'

export const useSpaceActionsEditQuota = () => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()
  const ability = useAbility()

  const getModalTitle = ({ resources }: { resources: SpaceResource[] }) => {
    if (resources.length === 1) {
      return $gettext('Change quota for Space »%{name}«', {
        name: resources[0].name
      })
    }
    return $gettext('Change quota for %{count} Spaces', {
      count: resources.length.toString()
    })
  }

  const handler = ({ resources }: SpaceActionOptions) => {
    dispatchModal({
      title: getModalTitle({ resources }),
      customComponent: QuotaModal,
      customComponentAttrs: () => ({
        spaces: resources,
        resourceType: 'space'
      })
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'editQuota',
      icon: 'cloud',
      label: () => {
        return $gettext('Edit quota')
      },
      handler,
      isVisible: ({ resources }) => {
        if (!resources || !resources.length) {
          return false
        }
        if (
          resources.some((r) => !isProjectSpaceResource(r) || (isSpaceResource(r) && !r.spaceQuota))
        ) {
          return false
        }
        return ability.can('set-quota-all', 'Drive')
      },
      class: 'oc-files-actions-edit-quota-trigger'
    }
  ])

  return {
    actions
  }
}
