<template>
  <div class="oc-link-resolve h-screen flex flex-col justify-center items-center">
    <oc-card :title="headerTitle" body-class="w-lg text-center" class="rounded-lg">
      <oc-spinner v-if="loading" data-testid="loading-spinner" :aria-hidden="true" />
      <p v-else-if="errorMessage" data-testid="error-message" class="text-xl">{{ errorMessage }}</p>
    </oc-card>
    <oc-button
      v-if="isUnacceptedShareError"
      type="router-link"
      appearance="filled"
      target="_blank"
      class="mt-4 text-center w-sm"
      :to="sharedWithMeRoute"
    >
      <span class="text" v-text="openSharedWithMeLabel" />
    </oc-button>
  </div>
</template>

<script lang="ts">
import {
  useRouteParam,
  useRouter,
  queryItemAsString,
  useRouteQuery,
  createLocationSpaces,
  createLocationShares,
  useClientService
} from '@opencloud-eu/web-pkg'
import { unref, defineComponent, computed, onMounted, ref, Ref } from 'vue'
import { dirname } from 'path'
import { createFileRouteOptions, useGetResourceContext } from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { call, isShareSpaceResource, Resource, SHARE_JAIL_ID } from '@opencloud-eu/web-client'
import { RouteLocationNamedRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'ResolvePrivateLink',
  setup() {
    const router = useRouter()
    const id = useRouteParam('fileId')
    const { $gettext } = useGettext()
    const clientService = useClientService()

    const resource: Ref<Resource> = ref()
    const sharedParentResource: Ref<Resource> = ref()
    const isUnacceptedShareError = ref(false)

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

      let result: Awaited<ReturnType<typeof getResourceContext>>
      try {
        result = yield getResourceContext(id)
      } catch (e) {
        // error means the resurce is an unaccepted/unsynced share
        isUnacceptedShareError.value = true
        throw e
      }

      const { space, resource } = result
      let { path } = result

      if (!path) {
        // empty path means the user has no access to the resource or it doesn't exist
        throw new Error('The file or folder does not exist')
      }

      let resourceIsNestedInShare = false
      let isHiddenShare = false
      if (isShareSpaceResource(space)) {
        sharedParentResource.value = resource
        resourceIsNestedInShare = path !== '/'
        if (!resourceIsNestedInShare) {
          // FIXME: get drive item by id as soon as server supports it
          const driveItems = yield* call(
            clientService.graphAuthenticated.driveItems.listSharedWithMe()
          )
          const share = driveItems.find(({ remoteItem }) => remoteItem.id === resource.id)

          isHiddenShare = share?.['@UI.Hidden']
        }
      }

      let fileId: string
      let targetLocation: RouteLocationNamedRaw
      if (unref(resource).type === 'folder') {
        fileId = unref(resource).fileId
        targetLocation = createLocationSpaces('files-spaces-generic')
      } else {
        fileId = unref(resource).parentFolderId
        path = dirname(path)
        targetLocation =
          space.driveType === 'share' && !resourceIsNestedInShare
            ? createLocationShares('files-shares-with-me')
            : createLocationSpaces('files-spaces-generic')
      }

      const { params, query } = createFileRouteOptions(space, { fileId, path })
      const openWithDefault = unref(openWithDefaultApp) !== 'false' && !unref(details)

      targetLocation.params = params
      targetLocation.query = {
        ...query,
        scrollTo: unref(resource).fileId,
        ...(unref(details) && { details: unref(details) }),
        ...(isHiddenShare && { 'q_share-visibility': 'hidden' }),
        ...(openWithDefault && { openWithDefaultApp: 'true' })
      }

      router.push(targetLocation)
    })

    const loading = computed(() => {
      return !resolvePrivateLinkTask.last || resolvePrivateLinkTask.isRunning
    })

    const sharedWithMeRoute = computed(() => {
      return { name: 'files-shares-with-me' }
    })

    const openSharedWithMeLabel = computed(() => {
      return $gettext('Open "Shared with me"')
    })

    const headerTitle = computed(() => {
      if (unref(loading)) {
        return $gettext('Resolving private link…')
      }
      if (unref(errorMessage)) {
        return $gettext('An error occurred while resolving the private link')
      }
      return ''
    })

    const errorMessage = computed(() => {
      if (unref(isUnacceptedShareError)) {
        return $gettext(
          'The link you are trying to access is invalid or you do not have permission to view the content. Please check the link for any errors or contact the person who shared it for assistance.'
        )
      }

      if (resolvePrivateLinkTask.isError) {
        return resolvePrivateLinkTask.last.error.message
      }
      return null
    })

    return {
      headerTitle,
      errorMessage,
      loading,
      resource,
      isUnacceptedShareError,
      sharedWithMeRoute,
      openSharedWithMeLabel,

      // HACK: for unit tests
      resolvePrivateLinkTask
    }
  }
})
</script>
