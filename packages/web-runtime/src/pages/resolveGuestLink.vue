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
import { call } from '@opencloud-eu/web-client'
import { createLocationGuest, useRouteParam, useRouter } from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import PlainCard from '../components/PlainCard.vue'

const router = useRouter()
const { $gettext } = useGettext()
const token = useRouteParam('token')

const resolveGuestLinkTask = useTask(function* () {
  const space = yield* call(authService.redeemGuestLink(unref(token)))
  yield router.replace(
    createLocationGuest('files-guest-link', { params: { driveAlias: space.driveAlias } })
  )
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
    console.error(error)
  }
})
</script>
