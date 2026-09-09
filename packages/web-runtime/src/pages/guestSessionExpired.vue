<template>
  <plain-card
    class="oc-guest-session-expired"
    :title="cardTitle"
    :description="cardDescription"
    icon="time"
  >
    <form v-if="canEnterPin" class="flex flex-col gap-4" @submit.prevent="verifyPinTask.perform()">
      <oc-text-input
        ref="pinInput"
        v-model="pin"
        :error-message="wrongPinMessage"
        :label="$gettext('PIN')"
        autocomplete="one-time-code"
      />
      <oc-button
        appearance="filled"
        size="large"
        class="oc-login-authorize-button w-full p-2"
        :disabled="!pin || verifyPinTask.isRunning"
        submit="submit"
      >
        <span v-text="$gettext('Continue')" />
      </oc-button>
    </form>
  </plain-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, unref, useTemplateRef } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { call, Resource } from '@opencloud-eu/web-client'
import {
  createFileRouteOptions,
  createLocationSpaces,
  useAuthStore,
  useClientService,
  useLinkTargetRoute,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import PlainCard from '../components/PlainCard.vue'

const clientService = useClientService()
const router = useRouter()
const authStore = useAuthStore()
const spacesStore = useSpacesStore()
const { $gettext } = useGettext()
const { getLinkTargetRoute } = useLinkTargetRoute()

const pinInputRef = useTemplateRef<HTMLInputElement>('pinInput')
const pin = ref('')

// The share id comes from the store rather than the route, so it never ends up in a URL that
// could be copied out of the address bar.
const canEnterPin = computed(() => !!authStore.guestShareId)

const verifyPinTask = useTask(function* (signal) {
  const session = yield* call(authService.verifyGuestPin(unref(pin)))
  const space = spacesStore.getSpace(session.shareId)

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
}).restartable()

const cardTitle = computed(() => $gettext('Guest session expired'))

const cardDescription = computed(() => {
  if (unref(canEnterPin)) {
    return $gettext(
      'We sent a new invitation link and a PIN to your email address. Open the link, or enter the PIN here to continue.'
    )
  }
  return $gettext(
    'Your guest session has expired. Open the invitation link in your email inbox to continue.'
  )
})

const wrongPinMessage = computed(() => (verifyPinTask.isError ? $gettext('Incorrect PIN') : null))

onMounted(() => {
  unref(pinInputRef)?.focus()
})
</script>
