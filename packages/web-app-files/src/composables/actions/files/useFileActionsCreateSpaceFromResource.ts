import {
  isPersonalSpaceResource,
  isShareResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import PQueue from 'p-queue'
import {
  FileAction,
  FileActionOptions,
  useAbility,
  useClientService,
  useConfigStore,
  useCreateSpace,
  useIsResourceNameValid,
  useMessages,
  useModals,
  useResourcesStore,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'

export const useFileActionsCreateSpaceFromResource = () => {
  const { showMessage, showErrorMessage } = useMessages()
  const { can } = useAbility()
  const { $gettext, $ngettext } = useGettext()
  const { createSpace } = useCreateSpace()
  const clientService = useClientService()
  const router = useRouter()
  const hasCreatePermission = computed(() => can('create-all', 'Drive'))
  const { dispatchModal } = useModals()
  const configStore = useConfigStore()
  const spacesStore = useSpacesStore()
  const resourcesStore = useResourcesStore()
  const { isSpaceNameValid } = useIsResourceNameValid()

  const confirmAction = async ({
    spaceName,
    resources,
    space
  }: {
    spaceName: string
    resources: Resource[]
    space: SpaceResource
  }) => {
    const { webdav } = clientService
    const queue = new PQueue({
      concurrency: configStore.options.concurrentRequests.resourceBatchActions
    })
    const copyOps = []

    try {
      const createdSpace = await createSpace(spaceName)
      spacesStore.upsertSpace(createdSpace)

      if (resources.length === 1 && resources[0].isFolder) {
        // If a single folder is selected we copy its content to the space root folder.
        resources = (await webdav.listFiles(space, { path: resources[0].path })).children
      }

      for (const resource of resources) {
        copyOps.push(
          queue.add(() => webdav.copyFiles(space, resource, createdSpace, { path: resource.name }))
        )
      }

      await Promise.all(copyOps)
      resourcesStore.resetSelection()
      showMessage({ title: $gettext('Space was created successfully') })
    } catch (error) {
      console.error(error)
      const title =
        error.statusCode === 425
          ? $gettext('Some files could not be copied')
          : $gettext('Creating space failed…')
      showErrorMessage({ title, errors: [error] })
    }
  }

  const handler = ({ resources, space }: FileActionOptions) => {
    dispatchModal({
      title: $ngettext(
        'Create Space from »%{resourceName}«',
        'Create Space from selection',
        resources.length,
        {
          resourceName: resources[0].name
        }
      ),
      message: $ngettext(
        'Create Space with the content of »%{resourceName}«.',
        'Create Space with the selected files.',
        resources.length,
        {
          resourceName: resources[0].name
        }
      ),
      contextualHelperLabel: $gettext('The marked elements will be copied.'),
      contextualHelperData: {
        title: $gettext('Restrictions'),
        text: $gettext('Shares, versions and tags will not be copied.')
      },
      confirmText: $gettext('Create'),
      hasInput: true,
      inputLabel: $gettext('Space name'),
      inputRequiredMark: true,
      onInput: (name: string, setError: (error: string) => void) => {
        const { isValid, error } = isSpaceNameValid(name)
        setError(isValid ? null : error)
      },
      onConfirm: (spaceName: string) => confirmAction({ spaceName, space, resources })
    })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'create-space-from-resource',
      icon: 'function',
      handler,
      label: () => {
        return $gettext('Create Space from selection')
      },
      isVisible: ({ resources, space }) => {
        if (!resources.length) {
          return false
        }

        if (!unref(hasCreatePermission)) {
          return false
        }

        if (resources.some((r) => isShareResource(r))) {
          return false
        }

        return isPersonalSpaceResource(space)
      },
      class: 'oc-files-actions-create-space-from-resource-trigger'
    }
  ])

  return {
    actions
  }
}
