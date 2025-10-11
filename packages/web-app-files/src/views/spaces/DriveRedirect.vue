<template>
  <div class="flex w-full">
    <app-loading-spinner />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, unref } from 'vue'
import { useRoute, useRouter, useSpacesStore } from '@opencloud-eu/web-pkg'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { createFileRouteOptions } from '@opencloud-eu/web-pkg'
import { createLocationSpaces } from '@opencloud-eu/web-pkg'
import omit from 'lodash-es/omit'
import { RouteLocationRaw } from 'vue-router'

// 'personal/home' is used as personal drive alias from static contexts
// (i.e. places where we can't load the actual personal space)
const fakePersonalDriveAlias = 'personal/home'

export default defineComponent({
  name: 'DriveRedirect',
  components: {
    AppLoadingSpinner
  },
  props: {
    driveAliasAndItem: {
      type: String,
      required: false,
      default: ''
    }
  },
  setup(props) {
    const router = useRouter()
    const route = useRoute()
    const spacesStore = useSpacesStore()

    const personalSpace = computed(() => {
      return spacesStore.spaces.find((space) => space.driveType === 'personal')
    })

    const itemPath = computed(() => {
      return props.driveAliasAndItem.startsWith(fakePersonalDriveAlias)
        ? urlJoin(props.driveAliasAndItem.slice(fakePersonalDriveAlias.length))
        : '/'
    })

    if (!unref(personalSpace)) {
      router.replace(createLocationSpaces('files-spaces-projects'))
    } else {
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
  }
})
</script>
