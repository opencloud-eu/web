import PQueue from 'p-queue'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import { isLocationSharesActive, isLocationSpacesActive } from '@opencloud-eu/web-pkg'
import { useClientService } from '@opencloud-eu/web-pkg'
import { useLoadingService } from '@opencloud-eu/web-pkg'
import { useRouter } from '@opencloud-eu/web-pkg'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FileAction, FileActionOptions } from '@opencloud-eu/web-pkg'
import { useMessages, useConfigStore, useResourcesStore } from '@opencloud-eu/web-pkg'

export const useFileActionsEnableSync = () => {
  const { showMessage, showErrorMessage } = useMessages()
  const router = useRouter()
  const { $gettext, $ngettext } = useGettext()

  const clientService = useClientService()
  const loadingService = useLoadingService()
  const configStore = useConfigStore()

  const resourcesStore = useResourcesStore()
  const { updateResourceField } = resourcesStore

  const handler = async ({ resources }: FileActionOptions<IncomingShareResource>) => {
    const errors: Error[] = []
    const triggerPromises: Promise<void>[] = []
    const triggerQueue = new PQueue({
      concurrency: configStore.options.concurrentRequests.resourceBatchActions
    })
    resources.forEach((resource) => {
      triggerPromises.push(
        triggerQueue.add(async () => {
          try {
            const { graphAuthenticated } = clientService
            await graphAuthenticated.driveItems.createDriveItem(resource.driveId, {
              name: resource.name,
              remoteItem: { id: resource.fileId }
            })

            updateResourceField<IncomingShareResource>({
              id: resource.id,
              field: 'syncEnabled',
              value: true
            })
          } catch (error) {
            console.error(error)
            errors.push(error)
          }
        })
      )
    })
    await Promise.all(triggerPromises)

    if (errors.length === 0) {
      resourcesStore.resetSelection()

      if (isLocationSpacesActive(router, 'files-spaces-generic')) {
        showMessage({
          title: $ngettext(
            'Sync for the selected share was enabled successfully',
            'Sync for the selected shares was enabled successfully',
            resources.length
          )
        })
      }

      return
    }

    showErrorMessage({
      title: $ngettext(
        'Failed to enable sync for the the selected share',
        'Failed to enable sync for the selected shares',
        resources.length
      ),
      errors
    })
  }

  const actions = computed((): FileAction<IncomingShareResource>[] => [
    {
      name: 'enable-sync',
      icon: 'check',
      handler: (args) => loadingService.addTask(() => handler(args)),
      label: () => $gettext('Enable sync'),
      isVisible: ({ space, resources }) => {
        if (
          !isLocationSharesActive(router, 'files-shares-with-me') &&
          !isLocationSpacesActive(router, 'files-spaces-generic')
        ) {
          return false
        }
        if (resources.length === 0) {
          return false
        }

        if (
          isLocationSpacesActive(router, 'files-spaces-generic') &&
          (unref(space)?.driveType !== 'share' || resources.length > 1 || resources[0].path !== '/')
        ) {
          return false
        }

        return resources.some((resource) => !resource.syncEnabled)
      },
      class: 'oc-files-actions-enable-sync-trigger'
    }
  ])

  return {
    actions
  }
}
