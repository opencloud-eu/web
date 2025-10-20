<template>
  <div class="oc-link-resolve h-screen flex flex-col justify-center items-center">
    <oc-card
      :logo-url="logoImg"
      :title="headerTitle"
      body-class="w-lg text-center"
      class="rounded-lg"
    >
      <p v-if="errorMessage" data-testid="error-message" class="text-xl">
        {{ errorMessage }}
      </p>
      <form v-else-if="isPasswordRequired" @submit.prevent="resolvePublicLinkTask.perform(true)">
        <oc-text-input
          ref="passwordInput"
          v-model="password"
          :error-message="wrongPasswordMessage"
          :label="passwordFieldLabel"
          type="password"
          class="mb-2 [&_.oc-text-input-message]:justify-center"
        />
        <oc-button
          appearance="filled"
          class="oc-login-authorize-button"
          :disabled="!password"
          submit="submit"
        >
          <span v-text="$gettext('Continue')" />
        </oc-button>
      </form>
      <oc-spinner v-else :aria-hidden="true" />
      <template #footer>
        <p v-text="footerSlogan" />
      </template>
    </oc-card>
  </div>
</template>

<script lang="ts">
import { DavHttpError, PublicLinkType, SharePermissionBit } from '@opencloud-eu/web-client'
import { authService } from '../services/auth'

import {
  queryItemAsString,
  useAuthStore,
  useClientService,
  useConfigStore,
  useRoute,
  useRouteParam,
  useRouteQuery,
  useRouter,
  useSpacesStore,
  useThemeStore
} from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { ref, unref, computed, defineComponent, onMounted } from 'vue'
import {
  buildPublicSpaceResource,
  isPublicSpaceResource,
  PublicSpaceResource
} from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { urlJoin } from '@opencloud-eu/web-client'
import { RouteLocationNamedRaw } from 'vue-router'
import { dirname } from 'path'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'ResolvePublicLink',
  setup() {
    const configStore = useConfigStore()
    const clientService = useClientService()
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    const { $gettext } = useGettext()
    const token = useRouteParam('token')
    const redirectUrl = useRouteQuery('redirectUrl')
    const themeStore = useThemeStore()
    const spacesStore = useSpacesStore()

    const { currentTheme } = storeToRefs(themeStore)
    const logoImg = computed(() => unref(currentTheme).logo)
    const password = ref('')

    const isOcmLink = computed(() => {
      const split = unref(route).path.split('/')?.[1]
      return split === 'o'
    })

    const publicLinkType = computed<PublicLinkType>(() => {
      return unref(isOcmLink) ? 'ocm' : 'public-link'
    })

    const publicLinkName = computed(() => {
      return unref(isOcmLink) ? $gettext('OCM share') : $gettext('Public files')
    })

    const publicLinkSpace = computed(() =>
      buildPublicSpaceResource({
        id: unref(token),
        driveType: 'public',
        publicLinkType: unref(publicLinkType),
        name: unref(publicLinkName),
        ...(unref(password) && { publicLinkPassword: unref(password) })
      })
    )

    const item = computed(() => {
      return queryItemAsString(unref(route).params.driveAliasAndItem)
    })

    const detailsQuery = useRouteQuery('details')
    const details = computed(() => {
      return queryItemAsString(unref(detailsQuery))
    })

    const loadedSpace = ref<PublicSpaceResource>()
    const isPasswordRequired = ref(false)

    const loadPublicSpaceTask = useTask(function* (signal) {
      try {
        loadedSpace.value = yield clientService.webdav.getFileInfo(
          unref(publicLinkSpace),
          {},
          { signal }
        )
      } catch (error) {
        const err = error as DavHttpError

        if (err.statusCode === 401) {
          if (err.errorCode === 'ERR_MISSING_BASIC_AUTH') {
            isPasswordRequired.value = true
          }

          return
        }
        if (err.statusCode === 404) {
          throw new Error($gettext('The resource could not be located, it may not exist anymore.'))
        }
        throw err
      }
    })

    const verifyPasswordTask = useTask(function* (signal) {
      try {
        loadedSpace.value = yield clientService.webdav.getFileInfo(
          unref(publicLinkSpace),
          {},
          { signal }
        )
        if (!isPublicSpaceResource(unref(loadedSpace))) {
          const e: any = new Error($gettext('The resource is not a public link.'))
          e.resource = unref(loadedSpace)
          throw e
        }
      } catch (e) {
        if (e.statusCode === 401) {
          throw e
        }
        throw new Error($gettext('The resource could not be located, it may not exist anymore.'))
      }
    })
    const wrongPassword = computed(() => {
      if (verifyPasswordTask.isError) {
        return verifyPasswordTask.last.error.statusCode === 401
      }
      return false
    })

    const resolvePublicLinkTask = useTask(function* (signal, passwordRequired: boolean) {
      if (unref(isOcmLink) && !configStore.options.ocm.openRemotely) {
        throw new Error($gettext('Opening files from remote is disabled'))
      }

      yield authService.resolvePublicLink(
        unref(token),
        passwordRequired,
        passwordRequired ? unref(password) : '',
        unref(publicLinkType)
      )

      if (passwordRequired) {
        try {
          yield verifyPasswordTask.perform()
        } catch (e) {
          authStore.clearPublicLinkContext()
          console.error(e, e.resource)
          throw e
        }
      }

      const url = queryItemAsString(unref(redirectUrl))
      if (url) {
        router.push({ path: url })
        return
      }

      if (unref(loadedSpace).publicLinkPermission === SharePermissionBit.Create) {
        router.push({
          name: 'files-public-upload',
          params: { token: unref(token) },
          query: { fileId: unref(publicLinkSpace).fileId }
        })
        return
      }

      let scrollTo: string
      let fileId: string
      let path: string

      if (['folder', 'space'].includes(unref(loadedSpace).type)) {
        fileId = unref(loadedSpace).fileId
        path = unref(item)
      } else {
        fileId = unref(loadedSpace).parentFolderId
        scrollTo = unref(loadedSpace).fileId
        path = dirname(unref(item))
      }

      spacesStore.upsertSpace(unref(loadedSpace))

      const driveAliasAndItem = urlJoin(unref(isOcmLink) ? `ocm/` : `public/`, unref(token), path)
      const targetLocation: RouteLocationNamedRaw = {
        name: 'files-public-link',
        query: {
          openWithDefaultApp: 'true',
          ...(!!fileId && { fileId }),
          ...(!!scrollTo && { scrollTo }),
          ...(unref(details) && { details: unref(details) })
        },
        params: {
          driveAliasAndItem
        }
      }

      router.push(targetLocation)
    })

    const errorMessage = computed<string>(() => {
      if (resolvePublicLinkTask.isError && resolvePublicLinkTask.last.error.statusCode !== 401) {
        return resolvePublicLinkTask.last.error.message
      }

      if (loadPublicSpaceTask.isError) {
        return loadPublicSpaceTask.last.error.message
      }
      return null
    })

    onMounted(async () => {
      try {
        if (unref(isOcmLink)) {
          await resolvePublicLinkTask.perform(false)
          return
        }

        await loadPublicSpaceTask.perform()

        if (!unref(isPasswordRequired)) {
          await resolvePublicLinkTask.perform(false)
        }
      } catch (e) {
        console.error(e)
      }
    })

    const headerTitle = computed(() => {
      if (unref(errorMessage)) {
        return $gettext('An error occurred while loading the public link')
      }
      if (unref(isPasswordRequired)) {
        return $gettext('This resource is password-protected')
      }
      return $gettext('Loading public link…')
    })
    const footerSlogan = computed(() => unref(currentTheme).slogan)
    const passwordFieldLabel = computed(() => {
      return $gettext('Enter password for public link')
    })
    const wrongPasswordMessage = computed(() => {
      if (unref(wrongPassword)) {
        return $gettext('Incorrect password')
      }
      return null
    })

    return {
      isPasswordRequired,
      password,
      wrongPassword,
      passwordFieldLabel,
      wrongPasswordMessage,
      errorMessage,
      headerTitle,
      footerSlogan,
      resolvePublicLinkTask,
      loadPublicSpaceTask,
      logoImg
    }
  }
})
</script>
