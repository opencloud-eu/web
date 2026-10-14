<template>
  <plain-card
    class="oc-link-resolve"
    :title="cardTitle"
    :description="cardDescription"
    :icon="cardIcon"
  >
    <template v-if="hasError">
      <p v-if="errorMessage" data-testid="error-message" class="my-0">
        {{ errorMessage }}
      </p>
      <oc-button
        v-if="isRetryable"
        appearance="filled"
        size="large"
        class="w-full p-2"
        data-testid="retry-button"
        @click="resolveGuestLink"
      >
        <span v-text="$gettext('Try again')" />
      </oc-button>
    </template>
    <oc-spinner v-else :aria-hidden="true" />
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
  getRenewablePermissionId,
  GuestLinkErrorType,
  isRetryableGuestLinkErrorType
} from '../services/auth/guestSessionManager'
import PlainCard from '../components/PlainCard.vue'

const router = useRouter()
const { $gettext } = useGettext()
const token = useRouteParam('token')
const errorType = ref<GuestLinkErrorType>()

const resolveGuestLinkTask = useTask(function* () {
  const { permissionId, space } = yield* call(authService.redeemGuestLink(unref(token)))
  yield router.replace(
    createLocationGuest('files-guest-link', {
      params: { shareName: space.name },
      query: { permissionId }
    })
  )
})

// an expired or used link can still authorize sending a new link and PIN
function renewLink(error: unknown) {
  const permissionId = getRenewablePermissionId(error)
  if (!permissionId) {
    return false
  }
  router.replace({ name: 'renewGuestLink', params: { permissionId } })
  return true
}

const isRetryable = computed(() => isRetryableGuestLinkErrorType(unref(errorType)))
const hasError = computed(() => unref(errorType) !== undefined)

const errorMessage = computed(() => {
  switch (unref(errorType)) {
    case undefined:
    case GuestLinkErrorErrorTypeEnum.TokenInvalid:
    case GuestLinkErrorErrorTypeEnum.TokenNotFound:
    case GuestLinkErrorErrorTypeEnum.InvalidRequest:
      return null
    case GuestLinkErrorErrorTypeEnum.TokenExpired:
      return $gettext('This invitation link has expired.')
    case GuestLinkErrorErrorTypeEnum.TokenAlreadyRedeemed:
      return $gettext('This invitation link has already been used.')
    case GuestLinkErrorErrorTypeEnum.ShareExpired:
      return $gettext('Your access to the shared item has expired.')
    case GuestLinkErrorErrorTypeEnum.ShareNotFound:
      return $gettext('The shared item is no longer available.')
    default:
      if (unref(isRetryable)) {
        return $gettext('The invitation could not be opened. Please try again later.')
      }
      return $gettext('The invitation could not be opened.')
  }
})

const cardTitle = computed(() =>
  unref(hasError)
    ? $gettext('An error occurred while opening the invitation')
    : $gettext('Opening invitation…')
)
const cardDescription = computed(() => {
  if (!unref(hasError) || unref(isRetryable)) {
    return undefined
  }
  return $gettext('Ask the person who invited you for a new invitation.')
})
const cardIcon = computed(() => (unref(hasError) ? 'error-warning' : undefined))

async function resolveGuestLink() {
  errorType.value = undefined
  try {
    await resolveGuestLinkTask.perform()
  } catch (error) {
    if (renewLink(error)) {
      return
    }
    errorType.value = getGuestLinkErrorType(error)
    console.error('guest link could not be resolved:', unref(errorType))
  }
}

onMounted(resolveGuestLink)
</script>
