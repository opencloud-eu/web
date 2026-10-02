<template>
  <oc-card class="w-full rounded-xl shadow-md dark:border" body-class="p-6 sm:p-8">
    <div class="flex flex-col gap-4">
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-role-secondary-container"
      >
        <oc-icon
          :name="space ? 'checkbox-circle' : 'error-warning'"
          size-class="size-5"
          color="var(--oc-role-on-secondary-container)"
        />
      </span>
      <div class="flex flex-col gap-1">
        <h2 class="my-0 text-2xl font-bold" data-testid="guest-link-title" v-text="title" />
        <p
          class="my-0 text-role-on-surface-variant"
          data-testid="guest-link-description"
          v-text="description"
        />
      </div>
    </div>
  </oc-card>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useAuthStore, useRouteParam, useSpacesStore } from '@opencloud-eu/web-pkg'

const { $gettext } = useGettext()
const authStore = useAuthStore()
const spacesStore = useSpacesStore()
const driveAlias = useRouteParam('driveAlias')

const space = computed(() => {
  if (!authStore.guestContextReady) {
    return undefined
  }
  return spacesStore.spaces.find((s) => s.driveAlias === unref(driveAlias))
})

const title = computed(() =>
  unref(space) ? $gettext('Guest link authenticated') : $gettext('Guest link expired')
)

const description = computed(() => {
  if (!unref(space)) {
    return $gettext(
      'This invitation link is invalid or has expired. Ask the person who invited you for a new invitation.'
    )
  }
  return $gettext(
    'You have successfully authenticated this guest link to "%{name}", congratulations.',
    { name: unref(space).name }
  )
})
</script>
