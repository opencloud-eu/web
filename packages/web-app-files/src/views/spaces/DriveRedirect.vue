<template>
  <div class="flex w-full">
    <not-found-message v-if="isUnknownProjectSpace" class="w-full" />
    <app-loading-spinner v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, unref, watch } from 'vue'
import { useAuthStore, useRoute, useRouter, useSpacesStore } from '@opencloud-eu/web-pkg'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { createFileRouteOptions, createLocationGuest } from '@opencloud-eu/web-pkg'
import { createLocationSpaces } from '@opencloud-eu/web-pkg'
import omit from 'lodash-es/omit'
import { RouteLocationRaw } from 'vue-router'
import NotFoundMessage from '../../components/FilesList/NotFoundMessage.vue'

// 'personal/home' is used as personal drive alias from static contexts
// (i.e. places where we can't load the actual personal space)
const fakePersonalDriveAlias = 'personal/home'

const { driveAliasAndItem = '' } = defineProps<{
  driveAliasAndItem?: string
}>()

const router = useRouter()
const route = useRoute()
const spacesStore = useSpacesStore()
const authStore = useAuthStore()

const personalSpace = computed(() => {
  return spacesStore.spaces.find((space) => space.driveType === 'personal')
})

const itemPath = computed(() => {
  return driveAliasAndItem.startsWith(fakePersonalDriveAlias)
    ? urlJoin(driveAliasAndItem.slice(fakePersonalDriveAlias.length))
    : '/'
})

// a link to a project space the user can't access (anymore) must not silently open another space
const isUnknownProjectSpace = computed(
  () => !authStore.isGuestContext && driveAliasAndItem.startsWith('project/')
)

function redirect() {
  if (authStore.isGuestContext) {
    router.replace(createLocationGuest('files-guest-shares'))
    return
  }

  if (!unref(personalSpace)) {
    router.replace(createLocationSpaces('files-spaces-projects'))
    return
  }

  const { params, query } = createFileRouteOptions(unref(personalSpace), {
    path: unref(itemPath)
  })

  router
    .replace({
      ...omit(unref(route), 'fullPath'),
      path: unref(route).fullPath,
      params: {
        ...unref(route).params,
        ...params
      },
      query
    } as RouteLocationRaw)
    // avoid NavigationDuplicated error in console
    .catch(() => {})
}

// the drive resolver keeps this component while no space matches, e.g. when navigating
// from the not found message of an unknown project space to the personal space
watch(
  () => driveAliasAndItem,
  () => {
    if (unref(isUnknownProjectSpace)) {
      return
    }
    redirect()
  },
  { immediate: true }
)
</script>
