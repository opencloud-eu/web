<template>
  <div class="oc-link-resolve h-full flex flex-col justify-center items-center p-4">
    <app-loading-spinner v-if="loading" data-testid="loading-spinner" />
    <oc-card
      v-else-if="errorMessage"
      :title="$gettext('An error occurred while resolving the link')"
      body-class="text-center"
      header-class="text-center"
      class="w-auto md:w-lg rounded-lg"
    >
      <p data-testid="error-message" class="text-xl">{{ errorMessage }}</p>
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import {
  useRouteParam,
  useRouter,
  queryItemAsString,
  useRouteQuery,
  createLocationShares,
  useClientService,
  getSharedDriveItem,
  useSpacesStore,
  useGetResourceContext,
  useLinkTargetRoute,
  AppLoadingSpinner
} from '@opencloud-eu/web-pkg'
import { unref, computed, onMounted } from 'vue'
import { useTask } from 'vue-concurrency'
import {
  call,
  isShareSpaceResource,
  Resource,
  SHARE_JAIL_ID,
  SpaceResource
} from '@opencloud-eu/web-client'
import { RouteLocationNamedRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'

const router = useRouter()
const id = useRouteParam('fileId')
const { $gettext } = useGettext()
const clientService = useClientService()
const spacesStore = useSpacesStore()

const { getLinkTargetRoute } = useLinkTargetRoute()
const { getResourceContext } = useGetResourceContext()

const openWithDefaultAppQuery = useRouteQuery('openWithDefaultApp')
const openWithDefaultApp = computed(() => queryItemAsString(unref(openWithDefaultAppQuery)))

const detailsQuery = useRouteQuery('details')
const details = computed(() => {
  return queryItemAsString(unref(detailsQuery))
})

onMounted(() => {
  resolvePrivateLinkTask.perform(queryItemAsString(unref(id)))
})

const resolvePrivateLinkTask = useTask(function* (signal, id) {
  if (
    [
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}!${SHARE_JAIL_ID}`,
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}`
    ].includes(id)
  ) {
    return router.push(createLocationShares('files-shares-with-me'))
  }

  try {
    const { space, resource, path } = yield* call(getResourceContext(id))
    if (!path) {
      // empty path means the user has no access to the resource or it doesn't exist
      throw new Error('The file or folder does not exist')
    }

    const targetRoute = yield* call(getTargetRoute({ resource, space, path }))
    router.push(targetRoute)
  } catch (e) {
    console.error('Error resolving private link', e)
    throw e
  }
})

const getTargetRoute = async ({
  resource,
  space,
  path
}: {
  resource: Resource
  space: SpaceResource
  path: string
}): Promise<RouteLocationNamedRaw> => {
  let isHiddenShare = false
  if (isShareSpaceResource(space) && path === '/') {
    // if the resource is a share, we need to check if it is hidden to add the correct
    // filter query param to the url so the filter gets populated correctly in the file list.
    try {
      const driveItem = await getSharedDriveItem({
        graphClient: clientService.graphAuthenticated,
        spacesStore,
        space
      })

      isHiddenShare = driveItem?.['@UI.Hidden']
    } catch (e) {
      // failure to get the drive item is not critical, we can just ignore it and continue.
      // worst thing that can happen is that the filter query param is not set correctly
      // and the user needs to apply the filter manually in the UI.
      console.error(e)
    }
  }

  return getLinkTargetRoute({
    space,
    resource,
    path,
    openWithDefaultApp: unref(openWithDefaultApp) !== 'false',
    details: unref(details),
    ...(isHiddenShare && { fileListQuery: { 'q_share-visibility': 'hidden' } })
  })
}

const loading = computed(() => {
  return !resolvePrivateLinkTask.last || resolvePrivateLinkTask.isRunning
})

const errorMessage = computed(() => {
  if (resolvePrivateLinkTask.isError) {
    return $gettext(
      'The link you are trying to access is invalid or you do not have permission to view the content. Please check the link for any errors or contact the person who shared it for assistance.'
    )
  }
  return null
})
</script>
