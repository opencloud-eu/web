import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceResource, isProjectSpaceResource } from '@opencloud-eu/web-client'
import {
  SpaceAction,
  SpaceActionOptions,
  isPromiseFulfilled,
  isPromiseRejected,
  useAbility,
  useClientService,
  useLoadingService,
  useMessages,
  useModals,
  useRoute,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'

export const useSpaceActionsRestore = () => {
  const { showMessage, showErrorMessage } = useMessages()
  const userStore = useUserStore()
  const { $gettext, $ngettext } = useGettext()
  const ability = useAbility()
  const clientService = useClientService()
  const loadingService = useLoadingService()
  const route = useRoute()
  const { dispatchModal } = useModals()
  const spacesStore = useSpacesStore()

  const filterResourcesToRestore = (resources: SpaceResource[]): SpaceResource[] => {
    return resources.filter(
      (r) =>
        isProjectSpaceResource(r) &&
        typeof r.canRestore === 'function' &&
        r.canRestore({ user: userStore.user, ability })
    )
  }

  const restoreSpaces = async (spaces: SpaceResource[]) => {
    const client = clientService.graphAuthenticated
    const promises = spaces.map((space) =>
      client.drives
        .updateDrive(space.id, { name: space.name }, { headers: { Restore: 'true' } })
        .then((updatedSpace) => {
          if (unref(route).name === 'admin-settings-spaces') {
            space.disabled = false
            space.spaceQuota = updatedSpace.spaceQuota
          }
          spacesStore.updateSpaceField({ id: space.id, field: 'disabled', value: false })
          return true
        })
    )
    const results = await Promise.allSettled(promises)

    try {
      await spacesStore.loadGraphPermissions({ ids: spaces.map((s) => s.id), graphClient: client })
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Failed to update permissions for enabled spaces'),
        errors: [error]
      })
    }

    const succeeded = results.filter(isPromiseFulfilled)
    if (succeeded.length) {
      const title =
        succeeded.length === 1 && spaces.length === 1
          ? $gettext('Space »%{space}« was enabled successfully', { space: spaces[0].name })
          : $ngettext(
              '%{spaceCount} space was enabled successfully',
              '%{spaceCount} spaces were enabled successfully',
              succeeded.length,
              { spaceCount: succeeded.length.toString() }
            )
      showMessage({ title })
    }

    const failed = results.filter(isPromiseRejected)
    if (failed.length) {
      failed.forEach(console.error)

      const title =
        failed.length === 1 && spaces.length === 1
          ? $gettext('Failed to enable space »%{space}«', { space: spaces[0].name })
          : $ngettext(
              'Failed to enable %{spaceCount} space',
              'Failed to enable %{spaceCount} spaces',
              failed.length,
              { spaceCount: failed.length.toString() }
            )
      showErrorMessage({
        title,
        errors: failed.map((f) => f.reason)
      })
    }
  }

  const handler = ({ resources }: SpaceActionOptions) => {
    const allowedResources = filterResourcesToRestore(resources)
    if (!allowedResources.length) {
      return
    }
    const message = $ngettext(
      'If you enable the selected space, it can be accessed again.',
      'If you enable the %{count} selected spaces, they can be accessed again.',
      allowedResources.length,
      { count: allowedResources.length.toString() }
    )
    const confirmText = $gettext('Enable')

    dispatchModal({
      title: $ngettext(
        'Enable Space »%{space}«?',
        'Enable %{spaceCount} Spaces?',
        allowedResources.length,
        {
          space: allowedResources[0].name,
          spaceCount: allowedResources.length.toString()
        }
      ),
      confirmText,
      message,
      hasInput: false,
      onConfirm: () => restoreSpaces(allowedResources)
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'restore',
      icon: 'play-circle',
      label: () => $gettext('Enable'),
      handler,
      isVisible: ({ resources }) => {
        if (resources.some((r) => !isProjectSpaceResource(r))) {
          return false
        }

        return !!filterResourcesToRestore(resources).length
      },
      class: 'oc-files-actions-restore-trigger'
    }
  ])

  return {
    actions,

    // HACK: exported for unit tests:
    restoreSpaces
  }
}
