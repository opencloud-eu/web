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
              <div class="flex">
                <h1>{{ $gettext('Manage Fonts') }}</h1>
              </div>
              <div class="flex">
                <oc-file-input
                  v-model="files"
                  file-types=".ttf,.otf"
                  :multiple="true"
                  :label="$gettext('Select font')"
                  class="my-6"
                />
              </div>
            </div>
            <oc-table-simple>
              <oc-table-head>
                <oc-table-tr>
                  <oc-table-th>{{ $gettext('Name') }}</oc-table-th>
                  <oc-table-th>{{ $gettext('Preview') }}</oc-table-th>
                  <oc-table-th class="hidden md:table-cell">{{ $gettext('Version') }}</oc-table-th>
                  <oc-table-th class="hidden md:table-cell">{{ $gettext('Designer') }}</oc-table-th>
                </oc-table-tr>
              </oc-table-head>
              <oc-table-body>
                <oc-table-tr v-for="font in fontsData" :key="font.family">
                  <oc-table-td>{{ font.family }}</oc-table-td>
                  <oc-table-td
                    ><img :src="`/collaboration/fonts/preview/${font.file}`" alt=""
                  /></oc-table-td>
                  <oc-table-td class="hidden md:table-cell">{{ font.version }}</oc-table-td>
                  <oc-table-td class="hidden md:table-cell">{{ font.designer }}</oc-table-td>
                  <oc-table-td class="text-right">
                    <oc-button :aria-label="$gettext('Delete')" @click="deleteFont(font)">
                      <oc-icon name="delete-bin" fill-type="line" size-class="size-4" />
                    </oc-button>
                  </oc-table-td>
                </oc-table-tr>
              </oc-table-body>
            </oc-table-simple>
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
  useIsTopBarSticky
} from '@opencloud-eu/web-pkg'
import { useAsyncState } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { BreadcrumbItem } from '@opencloud-eu/design-system/helpers'

interface Font {
  file: string
  family: string
  copyright: string
  version: string
  trademark: string
  manufacturer: string
  designer: string
  description: string
  vendor_url: string
  designer_url: string
  license: string
  license_url: string
  uri: string
}

const { $gettext } = useGettext()
const { showErrorMessage } = useMessages()
const { isSticky } = useIsTopBarSticky()
const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  {
    text: $gettext('Office')
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

const files = ref<FileList>()
watch(files, async (newFiles) => {
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
})

const deleteFont = async (font: Font) => {
  try {
    await httpClient.delete(`/collaboration/fonts/manage/${font.file}`)
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

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

th,
td {
  @apply p-4;
}
</style>
