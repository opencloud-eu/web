<template>
  <app-loading-spinner v-if="loading" />
  <div v-else class="h-full box-border overflow-auto p-2 sm:p-6 lg:p-12">
    <drop-zone class="lg:inset-12 sm:inset-6 inset-2" />
    <div
      id="files-drop-container"
      class="min-h-full box-border flex flex-col items-center justify-center p-4 sm:p-8 relative rounded-xl border-2 border-dashed border-role-secondary-container"
    >
      <h1 class="sr-only">{{ pageTitle }}</h1>
      <div v-if="errorMessage" class="text-center">
        <h2 v-text="$gettext('An error occurred while loading the public link')" />
        <p class="m-0" v-text="errorMessage" />
      </div>
      <div
        v-else-if="uploadedFileCount"
        role="status"
        aria-live="polite"
        class="flex flex-col items-center text-center max-w-xl"
      >
        <div class="flex items-center justify-center size-20 rounded-full bg-green-800 text-white">
          <oc-icon name="check" fill-type="line" size-class="size-10" />
        </div>
        <h2 class="mt-6 text-2xl sm:text-3xl font-bold break-words" v-text="successTitle" />
        <p class="mt-4 mb-0 text-role-on-surface-variant" v-text="successDescription" />
        <p v-if="failedFileCount" class="mt-2 mb-0 text-role-error" v-text="failureDescription" />
        <oc-button
          ref="uploadMoreBtn"
          class="mt-8 px-6 py-3 font-semibold"
          appearance="filled"
          @click="resetUploadState"
        >
          {{ $gettext('Upload more files') }}
        </oc-button>
      </div>
      <div v-else class="flex flex-col items-center text-center max-w-xl">
        <div
          class="flex items-center justify-center size-20 rounded-2xl bg-role-secondary-container"
        >
          <oc-icon
            name="upload-2"
            fill-type="line"
            size-class="size-8"
            class="text-role-secondary"
          />
        </div>
        <h2 class="mt-6 text-2xl sm:text-3xl font-bold break-words">
          <template v-if="shareOwner">
            <span v-text="titleParts[0]" /><span
              class="text-role-secondary"
              v-text="shareOwner"
            /><span v-text="titleParts[1]" />
          </template>
          <template v-else>{{ $gettext('Upload files') }}</template>
        </h2>
        <p
          class="mt-2 mb-0 text-role-on-surface-variant"
          v-text="
            $gettext(
              'Drop files here to upload or click the button below to select files or folders.'
            )
          "
        />
        <resource-upload
          id="files-drop-zone"
          class="mt-8"
          btn-class="px-6 py-3 font-semibold"
          btn-appearance="filled"
          btn-justify-content="center"
          :btn-label="$gettext('Select files')"
        >
          <template #default="{ labelId, label }">
            <oc-icon name="upload-2" fill-type="line" size-class="size-5" />
            <span :id="labelId">{{ label }}</span>
          </template>
        </resource-upload>
        <resource-upload
          class="mt-3"
          btn-class="underline"
          is-folder
          :btn-label="$gettext('Select folder')"
        >
          <template #default="{ labelId, label }">
            <span :id="labelId">{{ label }}</span>
          </template>
        </resource-upload>
        <p
          id="files-drop-info-message"
          class="mt-8 mb-0 px-4 py-2 rounded-full bg-role-surface-container text-sm text-role-on-surface-variant"
          v-text="
            $gettext(
              'Transfer of nested folder structures is not possible. Instead, all files from the subfolders will be uploaded individually.'
            )
          "
        />
        <p class="mt-8 mb-0 text-sm text-role-on-surface-variant" v-text="themeSlogan" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  createLocationPublic,
  createLocationSpaces,
  useAuthStore,
  useMessages,
  useSpacesStore,
  useThemeStore,
  useUserStore,
  useExtensionRegistry,
  useResourcesStore,
  useClientService,
  useRouter,
  useRoute,
  useGetMatchingSpace,
  useRouteQuery,
  queryItemAsString,
  useUpload,
  useService,
  UppyService,
  UploadResult,
  useAuthService,
  createFileRouteOptions
} from '@opencloud-eu/web-pkg'
import ResourceUpload from '../components/AppBar/Upload/ResourceUpload.vue'
import DropZone from '../components/DropZone.vue'
import {
  computed,
  onMounted,
  onBeforeUnmount,
  ref,
  unref,
  nextTick,
  watch,
  useTemplateRef,
  ComponentPublicInstance
} from 'vue'
import { useGettext } from 'vue3-gettext'
import { HandleUpload } from '../HandleUpload'
import { PublicSpaceResource, SharePermissionBit } from '@opencloud-eu/web-client'
import { OcButton } from '@opencloud-eu/design-system/components'

const uppyService = useService<UppyService>('$uppyService')
const { $gettext, $ngettext } = useGettext()
const userStore = useUserStore()
const messageStore = useMessages()
const themeStore = useThemeStore()
const spacesStore = useSpacesStore()
const router = useRouter()
const route = useRoute()
const language = useGettext()
const authService = useAuthService()
const clientService = useClientService()
const authStore = useAuthStore()
const { getInternalSpace } = useGetMatchingSpace()
useUpload({ uppyService })

const resourcesStore = useResourcesStore()
const extensionRegistry = useExtensionRegistry()

const { currentTheme } = storeToRefs(themeStore)
const themeSlogan = computed(() => unref(currentTheme).slogan)

const fileIdQueryItem = useRouteQuery('fileId')
const fileId = computed(() => {
  return queryItemAsString(unref(fileIdQueryItem))
})

if (!uppyService.getPlugin('HandleUpload')) {
  uppyService.addPlugin(HandleUpload, {
    clientService,
    language,
    route,
    userStore,
    spacesStore,
    messageStore,
    resourcesStore,
    extensionRegistry,
    uppyService,
    quotaCheckEnabled: false,
    directoryTreeCreateEnabled: false,
    conflictHandlingEnabled: false
  })
}

const share = ref<PublicSpaceResource>()
const uploadedFileCount = ref(0)
const failedFileCount = ref(0)
const uploadMoreBtn = useTemplateRef<ComponentPublicInstance<typeof OcButton>>('uploadMoreBtn')
const loading = ref(true)
const errorMessage = ref<string>()

const resolveToInternalLocation = (path: string) => {
  const internalSpace = getInternalSpace(unref(fileId).split('!')[0])
  if (internalSpace) {
    const routeOpts = createFileRouteOptions(internalSpace, { fileId: unref(fileId), path })
    return router.push(createLocationSpaces('files-spaces-generic', routeOpts))
  }

  // no internal space found -> share -> resolve via private link as it holds all the necessary logic
  return router.push({ name: 'resolvePrivateLink', params: { fileId: unref(fileId) } })
}

const resolvePublicLink = async () => {
  loading.value = true

  if (authStore.userContextReady && unref(fileId)) {
    try {
      const path = await clientService.webdav.getPathForFileId(unref(fileId))
      await resolveToInternalLocation(path)
      loading.value = false
      return
    } catch {
      // getPathForFileId failed means the user doesn't have internal access to the resource
    }
  }

  const space = spacesStore.spaces.find(
    (s) => s.driveAlias === `public/${authStore.publicLinkToken}`
  )

  clientService.webdav
    .listFiles(space, {}, { depth: 0 })
    .then(({ resource }) => {
      // Redirect to files list if the link doesn't have role "uploader"
      // FIXME: check for type once public-link-permission dav property is set correctly and reflects sharing–ng
      const sharePermissions = (resource as PublicSpaceResource).publicLinkPermission
      if (sharePermissions !== SharePermissionBit.Create) {
        router.replace(
          createLocationPublic('files-public-link', {
            params: { driveAliasAndItem: `public/${authStore.publicLinkToken}` }
          })
        )
        return
      }
      share.value = resource as PublicSpaceResource
    })
    .catch((error) => {
      // likely missing password, redirect to public link password prompt
      if (error.statusCode === 401) {
        return authService.handleAuthError(unref(router.currentRoute))
      }
      console.error(error)
      errorMessage.value = error
    })
    .finally(() => {
      loading.value = false
    })
}

watch(loading, async (newLoadValue) => {
  if (!newLoadValue) {
    await nextTick()
    uppyService.useDropTarget({ targetSelector: '#files-drop-container' })
  } else {
    uppyService.removeDropTarget()
  }
})

const pageTitle = computed(() => $gettext(unref(route).meta.title as string))
const shareOwner = computed(() => unref(share)?.publicLinkShareOwner || '')
const titleParts = computed(() => $gettext('Upload files for %{owner}').split('%{owner}'))

const successTitle = computed(() =>
  $ngettext('%{count} file transferred', '%{count} files transferred', unref(uploadedFileCount), {
    count: unref(uploadedFileCount).toString()
  })
)

const successDescription = computed(() => {
  if (!unref(shareOwner)) {
    return $gettext('Your files have been successfully received.')
  }
  return $gettext('%{owner} has successfully received your files.', {
    owner: unref(shareOwner)
  })
})

const failureDescription = computed(() =>
  $ngettext(
    '%{count} file could not be transferred.',
    '%{count} files could not be transferred.',
    unref(failedFileCount),
    { count: unref(failedFileCount).toString() }
  )
)

function resetUploadState() {
  uploadedFileCount.value = 0
  failedFileCount.value = 0
}

function onUploadCompleted(result: UploadResult) {
  const successful = result.successful?.length || 0
  if (!successful) {
    return
  }
  uploadedFileCount.value = successful
  failedFileCount.value = result.failed?.length || 0
}

watch(uploadedFileCount, async (count) => {
  if (!count) {
    return
  }
  await nextTick()
  unref(uploadMoreBtn)?.$el?.focus()
})

let uploadCompletedSub: string

onMounted(() => {
  uploadCompletedSub = uppyService.subscribe('uploadCompleted', onUploadCompleted)
  resolvePublicLink()
})

onBeforeUnmount(() => {
  uppyService.unsubscribe('uploadCompleted', uploadCompletedSub)
  uppyService.removeDropTarget()
  uppyService.removePlugin(uppyService.getPlugin('HandleUpload'))
})
</script>
