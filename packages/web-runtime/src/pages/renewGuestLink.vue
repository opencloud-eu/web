<template>
  <plain-card
    class="oc-link-resolve"
    :title="cardTitle"
    :description="cardDescription"
    :icon="cardIcon"
  >
    <template v-if="renewErrorType">
      <p data-testid="error-message" class="my-0" v-text="renewErrorMessage" />
      <oc-button
        v-if="isRenewRetryable"
        appearance="filled"
        size="large"
        class="w-full p-2"
        data-testid="retry-button"
        @click="renew"
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
import { computed, onMounted, ref, unref } from 'vue'
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
const pin = ref('')
const pinErrorType = ref<GuestLinkErrorType>()

const verifyPinTask = useTask(function* () {
  const { permissionId: verifiedPermissionId, space } = yield* call(
    // a PIN pasted from the email might contain whitespace
    authService.verifyGuestLinkPin(unref(permissionId), unref(pin).replace(/\s/g, ''))
  )
  yield router.replace(
    createLocationGuest('files-guest-link', {
      params: { shareName: space.name },
      query: { permissionId: verifiedPermissionId }
    })
  )
})

const isRenewRetryable = computed(() => isRetryableGuestLinkErrorType(unref(renewErrorType)))

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

const renewErrorMessage = computed(() => {
  const errorType = unref(renewErrorType)
  if (unref(isRenewRetryable)) {
    return $gettext('A new invitation could not be requested. Please try again later.')
  }
  return (
    getShareErrorMessage(errorType) ||
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
  if (unref(renewErrorType)) {
    return getShareErrorMessage(unref(renewErrorType))
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
  if (unref(renewErrorType)) {
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

async function submitPin() {
  pinErrorType.value = undefined
  try {
    await verifyPinTask.perform()
  } catch (error) {
    pinErrorType.value = getGuestLinkErrorType(error)
    console.error('guest link pin could not be verified:', unref(pinErrorType))
  }
}

onMounted(() => {
  if (authService.isGuestLinkRenewalPending(unref(permissionId))) {
    isRenewed.value = true
    return
  }
  renew()
})
</script>
