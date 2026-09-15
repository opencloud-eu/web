<template>
  <plain-card
    class="oc-link-resolve"
    :title="cardTitle"
    :description="cardDescription"
    :icon="cardIcon"
  >
    <p v-if="errorMessage" data-testid="error-message" class="my-0">
      {{ errorMessage }}
    </p>
    <oc-spinner v-else :aria-hidden="true" />
  </plain-card>
</template>

<script setup lang="ts">
import { computed, onMounted, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { call, Resource } from '@opencloud-eu/web-client'
import {
  createFileRouteOptions,
  createLocationSpaces,
  useClientService,
  useLinkTargetRoute,
  useRouteParam,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import { GuestAuthError } from '../services/auth/guestAuth'
import PlainCard from '../components/PlainCard.vue'

const clientService = useClientService()
const router = useRouter()
const spacesStore = useSpacesStore()
const { $gettext } = useGettext()
const token = useRouteParam('token')
const { getLinkTargetRoute } = useLinkTargetRoute()

const resolveGuestLinkTask = useTask(function* (signal) {
  const session = yield* call(authService.resolveGuestLink(unref(token)))
  const space = spacesStore.getSpace(session.shareId)

  // Fetching the invited resource before resolving the target route is also what gives the
  // applications time to register their extensions, which `getLinkTargetRoute` needs to find
  // the default app of a single file.
  const resource: Resource = yield* call(
    clientService.webdav.getFileInfo(space, { path: '/' }, { signal })
  )

  if (resource.isFolder) {
    yield router.replace(
      createLocationSpaces('files-spaces-generic', createFileRouteOptions(space, { path: '' }))
    )
    return
  }

  yield router.replace(getLinkTargetRoute({ space, resource, path: '/', openWithDefaultApp: true }))
})

// Deliberately generic and never derived from the server response: nothing about the invitation
// may be disclosed before it has been successfully authenticated.
const errorMessage = computed(() => {
  if (!resolveGuestLinkTask.isError) {
    return null
  }
  return $gettext('This invitation link is invalid or has expired.')
})

const cardTitle = computed(() =>
  unref(errorMessage)
    ? $gettext('An error occurred while opening the invitation')
    : $gettext('Opening invitation…')
)
const cardDescription = computed(() =>
  unref(errorMessage) ? $gettext('Ask the person who invited you for a new invitation.') : undefined
)
const cardIcon = computed(() => (unref(errorMessage) ? 'error-warning' : undefined))

onMounted(async () => {
  try {
    await resolveGuestLinkTask.perform()
  } catch (error) {
    if (error instanceof GuestAuthError && error.errorType === 'token_expired') {
      await router.replace({ name: 'guestSessionExpired' })
      return
    }
    console.error(error)
  }
})
</script>
