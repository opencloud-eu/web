<template>
  <div class="flex w-full">
    <not-found-message v-if="isUnknownSpace" class="w-full" />
    <app-loading-spinner v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  useAuthStore,
  useDocumentTitle,
  useRoute,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { createFileRouteOptions, createLocationGuest } from '@opencloud-eu/web-pkg'
import { createLocationSpaces } from '@opencloud-eu/web-pkg'
import NotFoundMessage from '../../components/FilesList/NotFoundMessage.vue'
import {
  fakePersonalDriveAlias,
  isFakePersonalDriveAlias,
  isOwnedPersonalDriveAlias
} from '../../helpers/driveAlias'

const { driveAliasAndItem = '' } = defineProps<{
  driveAliasAndItem?: string
}>()

const router = useRouter()
const route = useRoute()
const spacesStore = useSpacesStore()
const authStore = useAuthStore()
const { $gettext } = useGettext()

const personalSpace = computed(() => {
  return spacesStore.spaces.find((space) => space.driveType === 'personal')
})

const itemPath = computed(() => {
  return isFakePersonalDriveAlias(driveAliasAndItem)
    ? urlJoin(driveAliasAndItem.slice(fakePersonalDriveAlias.length))
    : '/'
})

// a link to a space the user can't access (anymore), e.g. a project space or another user's
// personal space, must not silently open another space
const isUnknownSpace = computed(() => {
  if (authStore.isGuestContext) {
    return false
  }
  if (driveAliasAndItem.startsWith('project/')) {
    return true
  }
  return isOwnedPersonalDriveAlias(driveAliasAndItem)
})

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
      name: unref(route).name,
      params: {
        ...unref(route).params,
        ...params
      },
      query
    })
    // avoid NavigationDuplicated error in console
    .catch(() => {})
}

// the drive resolver keeps this component while no space matches, e.g. when navigating
// from the not found message of an unknown space to the personal space
watch(
  () => driveAliasAndItem,
  () => {
    if (unref(isUnknownSpace)) {
      return
    }
    redirect()
  },
  { immediate: true }
)

// only the not found message gets a title, a redirect leaves it to the view it redirects to
if (unref(isUnknownProjectSpace)) {
  useDocumentTitle({ titleSegments: computed(() => [$gettext('Resource not found')]) })
}
</script>
