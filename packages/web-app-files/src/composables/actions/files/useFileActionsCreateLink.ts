import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { LinkShare, isProjectSpaceResource } from '@opencloud-eu/web-client'
import {
  CreateLinkModal,
  FileAction,
  FileActionOptions,
  useAbility,
  useCapabilityStore,
  useClientService,
  useCopyLink,
  useLinkTypes,
  useLoadingService,
  useModals,
  useSharesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'

export const useFileActionsCreateLink = ({
  enforceModal = false
}: {
  enforceModal?: boolean
} = {}) => {
  const clientService = useClientService()
  const userStore = useUserStore()
  const { $gettext, $ngettext } = useGettext()
  const capabilityStore = useCapabilityStore()
  const ability = useAbility()
  const loadingService = useLoadingService()
  const { defaultLinkType } = useLinkTypes()
  const { addLink } = useSharesStore()
  const { dispatchModal } = useModals()
  const { copyLink } = useCopyLink()

  const handler = ({ space, resources }: FileActionOptions) => {
    const passwordEnforced = capabilityStore.sharingPublicPasswordEnforcedFor.read_only === true
    if (enforceModal || passwordEnforced) {
      dispatchModal({
        title: $ngettext(
          'Copy link for »%{resourceName}«',
          'Copy links for the selected items',
          resources.length,
          { resourceName: resources[0].name }
        ),
        customComponent: CreateLinkModal,
        customComponentAttrs: () => ({ space, resources }),
        hideActions: true
      })
      return
    }

    const promises = resources.map((resource) =>
      addLink({
        clientService,
        space,
        resource,
        options: {
          '@libre.graph.quickLink': false,
          displayName: $gettext('Unnamed link'),
          type: unref(defaultLinkType)
        }
      })
    )
    const createLinkHandler = () =>
      loadingService.addTask(() => Promise.allSettled<LinkShare>(promises))
    copyLink({ createLinkHandler })
  }

  const isVisible = ({ resources }: FileActionOptions) => {
    if (!resources.length) {
      return false
    }

    for (const resource of resources) {
      if (!resource.canShare({ user: userStore.user, ability })) {
        return false
      }

      if (isProjectSpaceResource(resource) && resource.disabled) {
        return false
      }
    }

    return true
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'create-links',
      icon: 'link',
      handler,
      label: () => {
        return $gettext('Create links')
      },
      isVisible,
      class: 'oc-files-actions-create-links'
    }
  ])

  return {
    actions
  }
}
