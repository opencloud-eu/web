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
  useMessages,
  useModals,
  useRoute,
  useRouter,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'

export const useSpaceActionsDisable = () => {
  const { showMessage, showErrorMessage } = useMessages()
  const userStore = useUserStore()
  const { $gettext, $ngettext } = useGettext()
  const ability = useAbility()
  const clientService = useClientService()
  const route = useRoute()
  const router = useRouter()
  const { dispatchModal } = useModals()
  const spacesStore = useSpacesStore()

  const filterResourcesToDisable = (resources: SpaceResource[]): SpaceResource[] => {
    return resources.filter(
      (r) => isProjectSpaceResource(r) && r.canDisable({ user: userStore.user, ability })
    )
  }

  const disableSpaces = async (spaces: SpaceResource[]) => {
    const currentRoute = unref(route)

    const client = clientService.graphAuthenticated
    const promises = spaces.map((space) =>
      client.drives.disableDrive(space.id).then(() => {
        if (currentRoute.name === 'files-spaces-generic') {
          router.push({ name: 'files-spaces-projects' })
        }
        if (currentRoute.name === 'admin-settings-spaces') {
          space.disabled = true
          space.spaceQuota = { total: space.spaceQuota.total }
        }
        spacesStore.updateSpaceField({ id: space.id, field: 'disabled', value: true })
        return true
      })
    )
    const results = await Promise.allSettled(promises)

    const succeeded = results.filter(isPromiseFulfilled)
    if (succeeded.length) {
      const title =
        succeeded.length === 1 && spaces.length === 1
          ? $gettext('Space »%{space}« was disabled successfully', { space: spaces[0].name })
          : $ngettext(
              '%{spaceCount} space was disabled successfully',
              '%{spaceCount} spaces were disabled successfully',
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
          ? $gettext('Failed to disable space »%{space}«', { space: spaces[0].name })
          : $ngettext(
              'Failed to disable %{spaceCount} space',
              'Failed to disable %{spaceCount} spaces',
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
    const allowedResources = filterResourcesToDisable(resources)
    if (!allowedResources.length) {
      return
    }
    const message = $ngettext(
      'If you disable the selected space, it can no longer be accessed. Only Space managers will still have access. Note: No files will be deleted from the server.',
      'If you disable the %{count} selected spaces, they can no longer be accessed. Only Space managers will still have access. Note: No files will be deleted from the server.',
      allowedResources.length,
      { count: allowedResources.length.toString() }
    )
    const confirmText = $gettext('Disable')

    dispatchModal({
      title: $ngettext(
        'Disable Space »%{space}«?',
        'Disable %{spaceCount} Spaces?',
        allowedResources.length,
        {
          space: allowedResources[0].name,
          spaceCount: allowedResources.length.toString()
        }
      ),
      confirmText,
      message,
      hasInput: false,
      onConfirm: () => disableSpaces(allowedResources)
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'disable',
      icon: 'stop-circle',
      label: () => $gettext('Disable'),
      handler,
      isVisible: ({ resources }) => {
        if (resources.some((r) => !isProjectSpaceResource(r))) {
          return false
        }

        return !!filterResourcesToDisable(resources).length
      },
      class: 'oc-files-actions-disable-trigger'
    }
  ])

  return {
    actions,

    // HACK: exported for unit tests:
    disableSpaces
  }
}
