<template>
  <main class="oc-link-resolve h-full flex flex-col justify-center items-center p-4">
    <h1 class="sr-only" v-text="$gettext('Private link')" />
    <app-loading-spinner v-if="loading" data-testid="loading-spinner" />
    <oc-card
      v-else-if="errorMessage"
      :title="$gettext('An error occurred while resolving the link')"
      body-class="text-center"
      header-class="text-center"
      class="w-auto md:w-lg rounded-lg"
    >
      <p data-testid="error-message" class="text-xl">{{ errorMessage }}</p>
      <oc-button
        v-if="showLoginAction"
        appearance="filled"
        size="large"
        class="w-full p-2"
        data-testid="login-button"
        v-bind="loginButtonAttrs"
      >
        <span v-text="$gettext('Log in')" />
      </oc-button>
    </oc-card>
  </main>
</template>

<script setup lang="ts">
import {
  useRouteParam,
  useRouter,
  queryItemAsString,
  useRouteQuery,
  createLocationShares,
  useGetResourceContext,
  useLinkTargetRoute,
  useAuthStore,
  useConfigStore,
  AppLoadingSpinner
} from '@opencloud-eu/web-pkg'
import { unref, computed, onMounted } from 'vue'
import { useTask } from 'vue-concurrency'
import {
  call,
  HttpError,
  isShareSpaceResource,
  Resource,
  SHARE_JAIL_ID,
  SpaceResource
} from '@opencloud-eu/web-client'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { RouteLocationNamedRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { authService } from '../services/auth'
import { isGuestSessionInvalidError } from '../services/auth/guestSessionManager'

const router = useRouter()
const id = useRouteParam('fileId')
const { $gettext } = useGettext()
const authStore = useAuthStore()
const configStore = useConfigStore()

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
  // share jail routes would end the guest session
  if (
    !authStore.isGuestContext &&
    [
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}!${SHARE_JAIL_ID}`,
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}`
    ].includes(id)
  ) {
    return router.push(createLocationShares('files-shares-with-me'))
  }

  try {
    const { space, resource, path, driveItem } = yield* call(getResourceContext(id))
    if (!path) {
      // empty path means the user has no access to the resource or it doesn't exist
      throw new Error('The file or folder does not exist')
    }

    const targetRoute = getTargetRoute({ resource, space, path, driveItem })
    router.push(targetRoute)
  } catch (e) {
    console.error('Error resolving private link', e)
    if (authStore.isGuestContext && isGuestSessionInvalidError(e)) {
      return authService.handleAuthError(unref(router.currentRoute), e)
    }
    throw e
  }
})

function isAccessDeniedError(error: unknown) {
  return error instanceof HttpError && [403, 404].includes(error.statusCode)
}

// the guest has no access, but a user might
const showLoginAction = computed(() => {
  return (
    authStore.isGuestContext &&
    resolvePrivateLinkTask.isError &&
    isAccessDeniedError(resolvePrivateLinkTask.last.error)
  )
})

const loginButtonAttrs = computed(() => {
  const redirectUrl = unref(router.currentRoute).fullPath
  if (configStore.options.loginUrl) {
    const loginUrl = new URL(encodeURI(configStore.options.loginUrl))
    loginUrl.searchParams.append('redirectUrl', redirectUrl)
    return { type: 'a' as const, href: loginUrl.toString() }
  }
  // the login page redirects to the IdP right away, so keep it out of the history
  return { onClick: () => router.replace({ path: '/login', query: { redirectUrl } }) }
})

function getTargetRoute({
  resource,
  space,
  path,
  driveItem
}: {
  resource: Resource
  space: SpaceResource
  path: string
  driveItem?: DriveItem
}): RouteLocationNamedRaw {
  // the hidden filter needs to be set in the url so the file list shows the share.
  // a guest lists its share in the regular file list, which has no visibility filter.
  const isHiddenShare =
    isShareSpaceResource(space) &&
    path === '/' &&
    !authStore.isGuestContext &&
    !!driveItem?.['@UI.Hidden']

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
