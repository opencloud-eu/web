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
    <form
      v-else-if="isPasswordRequired"
      class="flex flex-col gap-4"
      @submit.prevent="resolvePublicLinkTask.perform(true)"
    >
      <oc-text-input
        ref="passwordInput"
        v-model="password"
        :error-message="wrongPasswordMessage"
        :label="passwordFieldLabel"
        type="password"
      />
      <oc-button
        appearance="filled"
        size="large"
        class="oc-login-authorize-button w-full p-2"
        :disabled="!password"
        submit="submit"
      >
        <span v-text="$gettext('Continue')" />
      </oc-button>
    </form>
    <oc-spinner v-else :aria-hidden="true" />
  </plain-card>
</template>

<script setup lang="ts">
import { DavHttpError, PublicLinkType, SharePermissionBit } from '@opencloud-eu/web-client'
import { authService } from '../services/auth'
import { parsePathQuery } from '../router/helpers'

import {
  queryItemAsString,
  useAuthStore,
  useClientService,
  useLinkTargetRoute,
  useRoute,
  useRouteParam,
  useRouteQuery,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { ref, unref, computed, onMounted, useTemplateRef } from 'vue'
import {
  buildPublicSpaceResource,
  call,
  isPublicSpaceResource,
  PublicSpaceResource,
  Resource
} from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import PlainCard from '../components/PlainCard.vue'

const clientService = useClientService()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { $gettext } = useGettext()
const token = useRouteParam('token')
const redirectUrl = useRouteQuery('redirectUrl')
const spacesStore = useSpacesStore()

const passwordInputRef = useTemplateRef<HTMLInputElement>('passwordInput')
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

const openWithDefaultAppQuery = useRouteQuery('openWithDefaultApp')
const openWithDefaultApp = computed(() => queryItemAsString(unref(openWithDefaultAppQuery)))

const { getLinkTargetRoute } = useLinkTargetRoute()

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
  if (unref(isOcmLink)) {
    throw new Error($gettext('Opening files from remote is disabled'))
  }

  authService.resolvePublicLink(
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
    router.push(parsePathQuery(url))
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

  spacesStore.upsertSpace(unref(loadedSpace))

  const { resource, path } = yield* call(getTargetResource(signal))

  router.push(
    getLinkTargetRoute({
      space: unref(loadedSpace),
      resource,
      path,
      openWithDefaultApp: unref(openWithDefaultApp) !== 'false',
      details: unref(details)
    })
  )
})

/**
 * A public link to a single file has no file id of its own, while a link to a folder does.
 * The `public-link-item-type` dav property can't be used here, the server reports "folder"
 * in both cases.
 */
const isSingleFileLink = computed(() => {
  const space = unref(loadedSpace)
  return !space.fileId || space.fileId === space.id
})

/**
 * For a public link pointing to a single file, the link root is the file itself. Since the root
 * is built as a space, the actual file resource needs to be fetched to be able to resolve the
 * app it can be opened with.
 */
const getTargetResource = async (
  signal?: AbortSignal
): Promise<{ resource: Resource; path: string }> => {
  const space = unref(loadedSpace)
  if (unref(item) || !unref(isSingleFileLink)) {
    return { resource: space, path: unref(item) || '/' }
  }

  const { children } = await clientService.webdav.listFiles(unref(publicLinkSpace), {}, { signal })

  const resource = children.find(({ isFolder }) => !isFolder)
  if (!resource) {
    // fallback, the server always reports the file as a child of the link root,
    // so this shouldn't ever happen
    return { resource: space, path: '/' }
  }

  return { resource, path: resource.path }
}

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

    unref(passwordInputRef)?.focus()
  } catch (e) {
    console.error(e)
  }
})

const cardTitle = computed(() => {
  if (unref(errorMessage)) {
    return $gettext('An error occurred while loading the public link')
  }
  if (unref(isPasswordRequired)) {
    return $gettext('This link is password-protected')
  }
  return $gettext('Loading public link…')
})
const cardDescription = computed(() => {
  if (!unref(errorMessage) && unref(isPasswordRequired)) {
    return $gettext('Enter the password you received to open this link.')
  }
  return undefined
})
const cardIcon = computed(() => {
  if (unref(errorMessage)) {
    return 'error-warning'
  }
  if (unref(isPasswordRequired)) {
    return 'lock'
  }
  return undefined
})
const passwordFieldLabel = computed(() => {
  return $gettext('Password')
})
const wrongPasswordMessage = computed(() => {
  if (unref(wrongPassword)) {
    return $gettext('Incorrect password')
  }
  return null
})
</script>
