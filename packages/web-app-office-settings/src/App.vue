<template>
  <main class="flex app-content size-full rounded-l-xl">
    <app-loading-spinner v-if="fontsLoading" />
    <template v-else>
      <div class="flex w-full flex-1 h-full flex-nowrap sm:flex-wrap">
        <div class="relative grid grid-cols-1 flex-1 focus:outline-0 h-full overflow-y-auto gap-0">
          <div class="outline-0 z-0 flex flex-col">
            <div class="py-1 px-4 top-0 z-20 bg-role-surface" :class="{ sticky: isSticky }">
              <div class="flex justify-between items-center h-12">
                <oc-breadcrumb id="admin-settings-breadcrumb" :items="breadcrumbs" />
              </div>
              <div class="mt-2">
                <h1 class="text-2xl my-0" v-text="$gettext('Manage Fonts')" />
                <p
                  class="text-sm text-role-on-surface-variant mt-1 mb-0"
                  v-text="$gettext('Fonts available in the office documents editor.')"
                />
              </div>
              <div class="flex justify-between items-center my-6 gap-4">
                <oc-file-input
                  v-model="files"
                  file-types=".ttf,.otf"
                  :multiple="true"
                  :label="$gettext('Select font')"
                  :description-message="$gettext('Allowed file types: .ttf, .otf')"
                />
                <oc-search-bar
                  v-model="filterTerm"
                  class="w-3xs"
                  :label="$gettext('Search')"
                  :placeholder="$gettext('Search for fonts')"
                  button-hidden
                  :is-rounded="false"
                />
              </div>
            </div>
            <no-content-message
              v-if="!fontsData?.length"
              id="office-settings-fonts-empty"
              icon="font-size"
              icon-fill-type="none"
            >
              <template #message>
                <span v-text="$gettext('No fonts found')" />
              </template>
              <template #callToAction>
                <span v-text="$gettext('Upload a font and it will show up here')" />
              </template>
            </no-content-message>
            <fonts-list
              v-else
              :fonts="fontsData"
              :preview-urls="previewUrls"
              :filter-term="filterTerm"
              @delete="deleteFont"
            />
          </div>
        </div>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  useClientService,
  AppLoadingSpinner,
  useMessages,
  useIsTopBarSticky,
  NoContentMessage
} from '@opencloud-eu/web-pkg'
import { useAsyncState } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, unref, watch } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { BreadcrumbItem } from '@opencloud-eu/design-system/helpers'
import FontsList from './components/FontsList.vue'
import { Font } from './types'

const { $gettext } = useGettext()
const { showErrorMessage } = useMessages()
const { isSticky } = useIsTopBarSticky()
const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  {
    text: $gettext('Office'),
    to: { path: '/admin-settings/office' }
  }
])

const httpClient = useClientService().httpAuthenticated
const {
  state: fontsData,
  execute: refreshFonts,
  isLoading: fontsLoading
} = useAsyncState(async (): Promise<Font[]> => {
  try {
    const {
      data: { fonts }
    } = await httpClient.get<{ fonts: Font[] }>('/collaboration/fonts')
    await new Promise((resolve) => setTimeout(resolve, 500)) // prevent flickering
    return fonts
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to load fonts'),
      errors: [e]
    })
  }
}, null)

const previewUrls = ref<Record<string, string>>({})

function revokePreviewUrls() {
  Object.values(unref(previewUrls)).forEach((url) => URL.revokeObjectURL(url))
  previewUrls.value = {}
}

const loadPreviewsTask = useTask(function* (signal, fonts: Font[]) {
  const blobs: [string, Blob][] = yield Promise.all(
    fonts.map(async (font) => {
      try {
        const { data } = await httpClient.get<Blob>(
          `/collaboration/fonts/preview/${encodeURIComponent(font.file)}`,
          { responseType: 'blob', signal }
        )
        return [font.file, data]
      } catch (e) {
        if (!signal.aborted) {
          console.error(e)
        }
        return null
      }
    })
  )

  revokePreviewUrls()
  previewUrls.value = Object.fromEntries(
    blobs.filter((entry) => entry !== null).map(([file, blob]) => [file, URL.createObjectURL(blob)])
  )
}).restartable()

watch(fontsData, (fonts) => {
  if (!fonts) {
    return
  }
  loadPreviewsTask.perform(fonts)
})

onBeforeUnmount(revokePreviewUrls)

const filterTerm = ref('')

const files = ref<FileList>(null)
watch(files, async (newFiles) => {
  if (!newFiles?.length) {
    return
  }

  await Promise.all(
    Array.from(newFiles).map(async (file) => {
      const formData = new FormData()
      formData.append('font', file)
      try {
        await httpClient.post('/collaboration/fonts/manage/', formData)
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Failed to update fonts'),
          errors: [e]
        })
      }

      await refreshFonts()
    })
  )

  files.value = null
})

const deleteFont = async (font: Font) => {
  try {
    await httpClient.delete(`/collaboration/fonts/manage/${encodeURIComponent(font.file)}`)
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to delete font'),
      errors: [e]
    })
  }
  await refreshFonts()
}
</script>
