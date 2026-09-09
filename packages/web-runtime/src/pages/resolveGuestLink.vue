<template>
  <plain-card
    class="oc-link-resolve"
    :title="cardTitle"
    :description="cardDescription"
    :icon="cardIcon"
  >
    <template v-if="errorMessage">
      <p data-testid="error-message" class="my-0">
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
import { isAxiosError } from 'axios'
import { call } from '@opencloud-eu/web-client'
import {
  GuestLinkError,
  GuestLinkErrorErrorTypeEnum
} from '@opencloud-eu/web-client/graph/generated'
import { createLocationGuest, useRouteParam, useRouter } from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import PlainCard from '../components/PlainCard.vue'

const router = useRouter()
const { $gettext } = useGettext()
const token = useRouteParam('token')
const errorType = ref<GuestLinkErrorErrorTypeEnum | 'unknown'>()

const resolveGuestLinkTask = useTask(function* () {
  const { permissionId, space } = yield* call(authService.redeemGuestLink(unref(token)))
  yield router.replace(
    createLocationGuest('files-guest-link', {
      params: { shareName: space.name },
      query: { permissionId }
    })
  )
})

function getErrorType(error: unknown): GuestLinkErrorErrorTypeEnum | 'unknown' {
  if (!isAxiosError<GuestLinkError>(error)) {
    return 'unknown'
  }
  return error.response?.data?.errorType || 'unknown'
}

const isRetryable = computed(() =>
  ['unknown', GuestLinkErrorErrorTypeEnum.InternalError].includes(unref(errorType))
)

const errorMessage = computed(() => {
  switch (unref(errorType)) {
    case undefined:
      return null
    case GuestLinkErrorErrorTypeEnum.TokenExpired:
      return $gettext('This invitation link has expired.')
    case GuestLinkErrorErrorTypeEnum.TokenAlreadyRedeemed:
      return $gettext('This invitation link has already been used.')
    case GuestLinkErrorErrorTypeEnum.ShareExpired:
      return $gettext('Your access to the shared item has expired.')
    case GuestLinkErrorErrorTypeEnum.ShareNotFound:
      return $gettext('The shared item is no longer available.')
    case GuestLinkErrorErrorTypeEnum.TokenInvalid:
    case GuestLinkErrorErrorTypeEnum.TokenNotFound:
    case GuestLinkErrorErrorTypeEnum.InvalidRequest:
      return $gettext('This invitation link is invalid.')
    default:
      return $gettext('The invitation could not be opened. Please try again later.')
  }
})

const cardTitle = computed(() =>
  unref(errorMessage)
    ? $gettext('An error occurred while opening the invitation')
    : $gettext('Opening invitation…')
)
const cardDescription = computed(() => {
  if (!unref(errorMessage) || unref(isRetryable)) {
    return undefined
  }
  return $gettext('Ask the person who invited you for a new invitation.')
})
const cardIcon = computed(() => (unref(errorMessage) ? 'error-warning' : undefined))

async function resolveGuestLink() {
  errorType.value = undefined
  try {
    await resolveGuestLinkTask.perform()
  } catch (error) {
    errorType.value = getErrorType(error)
    console.error('guest link could not be resolved:', unref(errorType))
  }
}

onMounted(resolveGuestLink)
</script>
