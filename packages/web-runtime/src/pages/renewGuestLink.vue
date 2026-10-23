<template>
  <plain-card
    class="oc-link-resolve"
    :title="cardTitle"
    :description="cardDescription"
    :icon="cardIcon"
  >
    <template v-if="errorType">
      <p data-testid="error-message" class="my-0" v-text="errorMessage" />
      <oc-button
        v-if="canRetry"
        appearance="filled"
        size="large"
        class="w-full p-2"
        data-testid="retry-button"
        @click="retry"
      >
        <span v-text="$gettext('Try again')" />
      </oc-button>
    </template>
    <form v-else-if="renewal?.withPin" class="flex flex-col gap-4" @submit.prevent="submitPin">
      <oc-text-input
        v-model="pin"
        :label="$gettext('PIN')"
        :error-message="pinErrorMessage"
        autocomplete="one-time-code"
        inputmode="numeric"
        data-testid="pin-input"
      />
      <oc-button
        appearance="filled"
        size="large"
        class="w-full p-2"
        :disabled="!normalizedPin || verifyPinTask.isRunning"
        submit="submit"
        data-testid="pin-submit"
      >
        <span v-text="$gettext('Continue')" />
      </oc-button>
    </form>
    <oc-spinner v-else-if="!renewal" :aria-hidden="true" />
  </plain-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { call } from '@opencloud-eu/web-client'
import { GuestLinkErrorErrorTypeEnum } from '@opencloud-eu/web-client/graph/generated'
import { queryItemAsString, useRouteParam, useRouteQuery, useRouter } from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import {
  getGuestLinkErrorType,
  getGuestLinkRetryAt,
  GuestLinkErrorType,
  GuestLinkRenewal,
  GuestSession,
  isGuestSessionInvalidError,
  isRetryableGuestLinkErrorType
} from '../services/auth/guestSessionManager'
import PlainCard from '../components/PlainCard.vue'
import { useGuestLinkErrorMessages, useGuestLinkTargetRoute } from '../composables/guestLink'
import { isGuestContextAllowed, isGuestContextRequired, parsePathQuery } from '../router/helpers'

const router = useRouter()
const { $gettext } = useGettext()
const { getGuestLinkTargetRoute } = useGuestLinkTargetRoute()
const { getShareErrorMessage, getPinErrorMessage, getRateLimitMessage } =
  useGuestLinkErrorMessages()
const permissionId = useRouteParam('permissionId')
const redirectUrl = useRouteQuery('redirectUrl')
// set by the auth guard, the session might still be valid, e.g. after a network error
const resume = useRouteQuery('resume')
// set by the resolve page, the newest link is used or expired, so the backend replaces it
const linkUnusable = useRouteQuery('linkUnusable')

const renewal = ref<GuestLinkRenewal>()
const renewErrorType = ref<GuestLinkErrorType>()
const renewRetryAt = ref<Date>()
// the session exists, e.g. after a verified PIN, but its context couldn't be loaded
const resumeErrorType = ref<GuestLinkErrorType>()
const pin = ref('')
const pinErrorType = ref<GuestLinkErrorType>()
// a PIN pasted from the email might contain whitespace
const normalizedPin = computed(() => unref(pin).replace(/\s/g, ''))

async function openSession(session: GuestSession) {
  const url = queryItemAsString(unref(redirectUrl))
  if (url) {
    const location = parsePathQuery(url)
    const route = router.resolve(location)
    // other routes would end the guest session
    if (isGuestContextRequired(router, route) || isGuestContextAllowed(route)) {
      return router.replace(location)
    }
  }
  return router.replace(await getGuestLinkTargetRoute(session))
}

const verifyPinTask = useTask(function* () {
  yield authService.verifyGuestLinkPin(unref(permissionId), unref(normalizedPin))
})

const resumeSessionTask = useTask(function* () {
  const session = yield* call(authService.resumeGuestSession(unref(permissionId)))
  yield openSession(session)
})

const errorType = computed(() => unref(resumeErrorType) || unref(renewErrorType))
const isRetryable = computed(() => isRetryableGuestLinkErrorType(unref(errorType)))
const isRateLimited = computed(
  () => unref(renewErrorType) === GuestLinkErrorErrorTypeEnum.TooManyRequests
)
const canRetry = computed(() => unref(isRetryable) || unref(isRateLimited))

const errorMessage = computed(() => {
  if (unref(resumeErrorType)) {
    if (unref(isRetryable)) {
      return $gettext('The shared item could not be loaded. Please try again later.')
    }
    return (
      getShareErrorMessage(unref(resumeErrorType)) ||
      $gettext('The shared item could not be loaded.')
    )
  }
  if (unref(isRetryable)) {
    return $gettext('A new invitation could not be requested. Please try again later.')
  }
  if (unref(isRateLimited)) {
    return getRateLimitMessage(unref(renewRetryAt))
  }
  return (
    getShareErrorMessage(unref(renewErrorType)) ||
    $gettext(
      'A new invitation could not be requested. Open the invitation link from your most recent email instead.'
    )
  )
})

const pinErrorMessage = computed(() => getPinErrorMessage(unref(pinErrorType)))

const cardTitle = computed(() => {
  if (resumeSessionTask.isRunning) {
    return $gettext('Opening the shared item…')
  }
  if (unref(resumeErrorType)) {
    return $gettext('An error occurred while opening the shared item')
  }
  if (unref(renewErrorType)) {
    return $gettext('An error occurred while renewing your access')
  }
  if (unref(renewal)) {
    return $gettext('Check your inbox')
  }
  return $gettext('Renewing your access…')
})

const cardDescription = computed(() => {
  if (unref(errorType)) {
    return getShareErrorMessage(unref(errorType))
      ? $gettext('Ask the person who invited you for a new invitation.')
      : undefined
  }
  if (unref(renewal)?.withPin) {
    return $gettext(
      'We sent you an email with a new invitation link and a PIN. Open the link or enter the PIN to continue.'
    )
  }
  if (unref(renewal) && queryItemAsString(unref(linkUnusable)) === 'true') {
    return $gettext(
      'This invitation link can no longer be used. We sent you an email with a new one, open it to continue.'
    )
  }
  // without a session the backend only sends a new link if the newest one is used or expired
  if (unref(renewal)) {
    return $gettext(
      'Your access has expired. Open the invitation link from your most recent email to continue. If it has expired or has already been used, a new one is on its way.'
    )
  }
  return undefined
})

const cardIcon = computed(() => {
  if (unref(errorType)) {
    return 'error-warning'
  }
  return unref(renewal) ? 'mail-send' : undefined
})

async function renew() {
  renewErrorType.value = undefined
  renewRetryAt.value = undefined
  try {
    renewal.value = await authService.ensureGuestLinkRenewal(unref(permissionId))
  } catch (error) {
    // another tab might have renewed the link meanwhile
    renewal.value = authService.getPendingGuestLinkRenewal(unref(permissionId))
    if (unref(renewal)) {
      return
    }
    renewErrorType.value = getGuestLinkErrorType(error)
    renewRetryAt.value = getGuestLinkRetryAt(error)
    console.error('guest link could not be renewed:', unref(renewErrorType))
  }
}

function startRenewal() {
  renewal.value = authService.getPendingGuestLinkRenewal(unref(permissionId))
  if (unref(renewal)) {
    return
  }
  return renew()
}

async function resumeSession() {
  resumeErrorType.value = undefined
  // a verified PIN is used up, so don't offer the form while loading
  renewal.value = undefined
  try {
    await resumeSessionTask.perform()
  } catch (error) {
    // opening the session unmounts this page, which cancels the task
    if (error === 'cancel') {
      return
    }
    if (isGuestSessionInvalidError(error)) {
      return startRenewal()
    }
    resumeErrorType.value = getGuestLinkErrorType(error)
    console.error('guest session could not be resumed:', unref(resumeErrorType))
  }
}

function retry() {
  return unref(resumeErrorType) ? resumeSession() : renew()
}

async function submitPin() {
  pinErrorType.value = undefined
  try {
    await verifyPinTask.perform()
  } catch (error) {
    pinErrorType.value = getGuestLinkErrorType(error)
    console.error('guest link pin could not be verified:', unref(pinErrorType))
    return
  }
  await resumeSession()
}

// another tab might finish its renewal after this one checked for it
function onStorage() {
  if (unref(renewal) || resumeSessionTask.isRunning || unref(resumeErrorType)) {
    return
  }
  const pendingRenewal = authService.getPendingGuestLinkRenewal(unref(permissionId))
  if (!pendingRenewal) {
    return
  }
  renewErrorType.value = undefined
  renewal.value = pendingRenewal
}

onMounted(() => {
  window.addEventListener('storage', onStorage)
  if (
    authService.hasGuestSession(unref(permissionId)) ||
    queryItemAsString(unref(resume)) === 'true'
  ) {
    resumeSession()
    return
  }
  startRenewal()
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
})
</script>
