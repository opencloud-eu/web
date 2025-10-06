<template>
  <app-loading-spinner v-if="loading" />
  <div
    v-else
    id="files-drop-container"
    class="h-full flex flex-col justify-between m-12 bg-transparent border-dashed border-role-outline relative"
  >
    <div
      v-if="dragareaEnabled"
      class="absolute inset-0 z-90 bg-sky-600/20 rounded-xl pointer-events-none"
    />
    <h1 class="sr-only">{{ pageTitle }}</h1>
    <div class="p-4 h-full text-center">
      <div key="loaded-drop" class="flex flex-col">
        <h2 v-text="title" />
        <resource-upload
          id="files-drop-zone"
          ref="fileUpload"
          class="flex items-center justify-center oc-placeholder"
          :btn-label="$gettext('Drop files here to upload or click to select file')"
        />
        <div id="previews" hidden />
      </div>
      <div v-if="errorMessage">
        <h2>
          <span v-text="$gettext('An error occurred while loading the public link')" />
        </h2>
        <p class="m-0" v-text="errorMessage" />
      </div>
      <div v-else class="flex justify-center w-full">
        <p
          id="files-drop-info-message "
          class="m-0 pt-12 text-sm w-md lg:w-full"
          v-text="
            $gettext(
              'Note: Transfer of nested folder structures is not possible. Instead, all files from the subfolders will be uploaded individually.'
            )
          "
        />
      </div>

      <div class="mt-24">
        <p v-text="themeSlogan" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'
import {
  createLocationPublic,
  createLocationSpaces,
  useAuthStore,
  useMessages,
  useSpacesStore,
  useThemeStore,
  useUserStore,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import ResourceUpload from '../components/AppBar/Upload/ResourceUpload.vue'
import {
  computed,
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  unref,
  nextTick,
  watch
} from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  useClientService,
  useRouter,
  useRoute,
  useGetMatchingSpace,
  useRouteQuery,
  queryItemAsString,
  useUpload
} from '@opencloud-eu/web-pkg'
import { eventBus } from '@opencloud-eu/web-pkg'
import { useService, UppyService } from '@opencloud-eu/web-pkg'
import { useAuthService } from '@opencloud-eu/web-pkg'
import { HandleUpload } from '../HandleUpload'
import { createFileRouteOptions } from '@opencloud-eu/web-pkg'
import { PublicSpaceResource, SharePermissionBit } from '@opencloud-eu/web-client'

export default defineComponent({
  components: {
    ResourceUpload
  },
  setup() {
    const uppyService = useService<UppyService>('$uppyService')
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
        uppyService,
        quotaCheckEnabled: false,
        directoryTreeCreateEnabled: false,
        conflictHandlingEnabled: false
      })
    }

    const share = ref<PublicSpaceResource>()
    const dragareaEnabled = ref(false)
    const loading = ref(true)
    const errorMessage = ref<string>()
    let dragOver: string
    let dragOut: string
    let drop: string

    const hideDropzone = () => {
      dragareaEnabled.value = false
    }
    const onDragOver = (event: DragEvent) => {
      dragareaEnabled.value = (event.dataTransfer.types || []).some((e) => e === 'Files')
    }

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

    onMounted(() => {
      dragOver = eventBus.subscribe('drag-over', onDragOver)
      dragOut = eventBus.subscribe('drag-out', hideDropzone)
      drop = eventBus.subscribe('drop', hideDropzone)
      resolvePublicLink()
    })

    onBeforeUnmount(() => {
      eventBus.unsubscribe('drag-over', dragOver)
      eventBus.unsubscribe('drag-out', dragOut)
      eventBus.unsubscribe('drop', drop)
      uppyService.removeDropTarget()
      uppyService.removePlugin(uppyService.getPlugin('HandleUpload'))
    })

    return {
      dragareaEnabled,
      loading,
      errorMessage,
      share,
      themeSlogan
    }
  },
  computed: {
    pageTitle() {
      return this.$gettext(this.$route.meta.title as string)
    },
    title() {
      // share might not be loaded
      if (this.share) {
        return this.$gettext(
          '%{owner} shared this folder with you for uploading',
          { owner: this.share.publicLinkShareOwner },
          true
        )
      }
      return ''
    }
  }
})
</script>
