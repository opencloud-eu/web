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
        v-if="isRetryable"
        appearance="filled"
        size="large"
        class="w-full p-2"
        data-testid="retry-button"
        @click="retry"
      >
        <span v-text="$gettext('Try again')" />
      </oc-button>
    </template>
    <form v-else-if="isRenewed" class="flex flex-col gap-4" @submit.prevent="submitPin">
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
        :disabled="!pin || verifyPinTask.isRunning"
        submit="submit"
        data-testid="pin-submit"
      >
        <span v-text="$gettext('Continue')" />
      </oc-button>
    </form>
    <oc-spinner v-else-if="!isTokenMissing" :aria-hidden="true" />
  </plain-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { call } from '@opencloud-eu/web-client'
import { GuestLinkErrorErrorTypeEnum } from '@opencloud-eu/web-client/graph/generated'
import { createLocationGuest, useRouteParam, useRouter } from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import {
  getGuestLinkErrorType,
  GuestLinkErrorType,
  GuestLinkTokenMissingError,
  GuestSession,
  isGuestSessionInvalidError,
  isRetryableGuestLinkErrorType
} from '../services/auth/guestSessionManager'
import PlainCard from '../components/PlainCard.vue'

const router = useRouter()
const { $gettext } = useGettext()
const permissionId = useRouteParam('permissionId')

const isRenewed = ref(false)
// e.g. after a PIN login, only the link from the most recent email can renew the access
const isTokenMissing = ref(false)
const renewErrorType = ref<GuestLinkErrorType>()
// the session exists, e.g. after a verified PIN, but its context couldn't be loaded
const resumeErrorType = ref<GuestLinkErrorType>()
const pin = ref('')
const pinErrorType = ref<GuestLinkErrorType>()

function openSession({ permissionId: sessionPermissionId, space }: GuestSession) {
  return router.replace(
    createLocationGuest('files-guest-link', {
      params: { shareName: space.name },
      query: { permissionId: sessionPermissionId }
    })
  )
}

const verifyPinTask = useTask(function* () {
  // a PIN pasted from the email might contain whitespace
  yield authService.verifyGuestLinkPin(unref(permissionId), unref(pin).replace(/\s/g, ''))
})

const resumeSessionTask = useTask(function* () {
  const session = yield* call(authService.resumeGuestSession(unref(permissionId)))
  yield openSession(session)
})

const errorType = computed(() => unref(resumeErrorType) || unref(renewErrorType))
const isRetryable = computed(() => isRetryableGuestLinkErrorType(unref(errorType)))

function getShareErrorMessage(errorType: GuestLinkErrorType): string | undefined {
  switch (errorType) {
    case GuestLinkErrorErrorTypeEnum.ShareExpired:
      return $gettext('Your access to the shared item has expired.')
    case GuestLinkErrorErrorTypeEnum.ShareNotFound:
      return $gettext('The shared item is no longer available.')
    default:
      return undefined
  }
}

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
  return (
    getShareErrorMessage(unref(renewErrorType)) ||
    $gettext(
      'A new invitation could not be requested. Open the invitation link from your most recent email instead.'
    )
  )
})

const pinErrorMessage = computed(() => {
  const errorType = unref(pinErrorType)
  switch (errorType) {
    case undefined:
      return undefined
    case GuestLinkErrorErrorTypeEnum.PinInvalid:
      return $gettext('The PIN is incorrect.')
    case GuestLinkErrorErrorTypeEnum.PinExpired:
      return $gettext(
        'The PIN has expired. Open the invitation link from your most recent email to get a new one.'
      )
    default:
      return (
        getShareErrorMessage(errorType) ||
        $gettext('The PIN could not be verified. Please try again later.')
      )
  }
})

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
  if (unref(isRenewed)) {
    return $gettext('Check your inbox')
  }
  if (unref(isTokenMissing)) {
    return $gettext('Your access has expired')
  }
  return $gettext('Renewing your access…')
})

const cardDescription = computed(() => {
  if (unref(errorType)) {
    return getShareErrorMessage(unref(errorType))
      ? $gettext('Ask the person who invited you for a new invitation.')
      : undefined
  }
  if (unref(isRenewed)) {
    return $gettext(
      'Your access has expired. We sent you an email with a new invitation link and a PIN. Open the link or enter the PIN to continue.'
    )
  }
  if (unref(isTokenMissing)) {
    return $gettext('Open the invitation link from your most recent email to continue.')
  }
  return undefined
})

const cardIcon = computed(() => {
  if (unref(errorType)) {
    return 'error-warning'
  }
  if (unref(isTokenMissing)) {
    return 'mail'
  }
  return unref(isRenewed) ? 'mail-send' : undefined
})

async function renew() {
  renewErrorType.value = undefined
  try {
    await authService.renewGuestLink(unref(permissionId))
    isRenewed.value = true
  } catch (error) {
    // another tab might have renewed the link meanwhile
    if (authService.isGuestLinkRenewalPending(unref(permissionId))) {
      isRenewed.value = true
      return
    }
    if (error instanceof GuestLinkTokenMissingError) {
      isTokenMissing.value = true
      return
    }
    renewErrorType.value = getGuestLinkErrorType(error)
    console.error('guest link could not be renewed:', unref(renewErrorType))
  }
}

function startRenewal() {
  isRenewed.value = authService.isGuestLinkRenewalPending(unref(permissionId))
  if (unref(isRenewed)) {
    return
  }
  return renew()
}

async function resumeSession() {
  resumeErrorType.value = undefined
  // a verified PIN is used up, so don't offer the form while loading
  isRenewed.value = false
  try {
    await resumeSessionTask.perform()
  } catch (error) {
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
  if (unref(isRenewed) || resumeSessionTask.isRunning || unref(resumeErrorType)) {
    return
  }
  if (!authService.isGuestLinkRenewalPending(unref(permissionId))) {
    return
  }
  renewErrorType.value = undefined
  isTokenMissing.value = false
  isRenewed.value = true
}

onMounted(() => {
  window.addEventListener('storage', onStorage)
  if (authService.hasGuestSession(unref(permissionId))) {
    resumeSession()
    return
  }
  startRenewal()
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
})
</script>
