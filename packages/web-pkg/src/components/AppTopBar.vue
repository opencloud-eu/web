<template>
  <div
    class="oc-app-top-bar self-center flex col-[1/3] row-1 sm:col-2 [&_.parent-folder]:text-role-on-chrome"
  >
    <oc-button
      id="app-top-bar-close"
      appearance="raw-inverse"
      color-role="chrome"
      class="me-2"
      :aria-label="$gettext('Close')"
      no-hover
      @click="$emit('close')"
    >
      <oc-icon name="close" fill-type="line" />
    </oc-button>
    <div
      class="pe-1 my-2 mx-auto sm:m-0 inline-flex items-center bg-role-chrome rounded-lg h-10 gap-2 w-full sm:w-fit"
    >
      <div class="open-file-bar flex">
        <resource-list-item
          v-if="resource"
          id="app-top-bar-resource"
          class="[&_.oc-resource-name]:max-w-16 sm:[&_.oc-resource-name]:max-w-60 [&_.oc-resource-basename]:text-role-on-chrome [&_.oc-resource-extension]:text-role-on-chrome"
          :is-thumbnail-displayed="false"
          :is-extension-displayed="areFileExtensionsShown"
          :resource="resource"
          :is-favorite-displayed="false"
          :is-resource-clickable="false"
        />
      </div>
      <div class="flex">
        <div v-if="mainActions.length && resource">
          <context-action-menu
            :menu-sections="[
              {
                name: 'main-actions',
                items: mainActions
                  .filter((action) => action.isVisible())
                  .map((action) => {
                    return {
                      ...action,
                      class: 'p-1 text-role-on-chrome [&_svg]:!fill-role-on-chrome no-hover',
                      hideLabel: true
                    }
                  })
              }
            ]"
            :action-options="{
              resources: [resource]
            }"
            appearance="raw-inverse"
            color-role="chrome"
          />
          <oc-hidden-announcer :announcement="showSavingIndicator ? $gettext('Saving…') : ''" />
        </div>
        <template v-if="dropDownMenuSections.length">
          <oc-button
            id="oc-openfile-contextmenu-trigger"
            v-oc-tooltip="contextMenuLabel"
            :aria-label="contextMenuLabel"
            appearance="raw-inverse"
            color-role="chrome"
            class="p-1"
            no-hover
          >
            <oc-icon name="more-2" />
          </oc-button>
          <oc-drop
            drop-id="oc-openfile-contextmenu"
            mode="click"
            padding-size="small"
            toggle="#oc-openfile-contextmenu-trigger"
            close-on-click
            :title="resource.name"
            @click.stop.prevent
          >
            <context-action-menu
              :menu-sections="dropDownMenuSections"
              :action-options="dropDownActionOptions"
            />
          </oc-drop>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, unref, watch } from 'vue'
import ContextActionMenu from './ContextActions/ContextActionMenu.vue'
import { useGettext } from 'vue3-gettext'
import { Action, FileActionOptions, useLoadingService, useResourcesStore } from '../composables'
import ResourceListItem from './FilesList/ResourceListItem.vue'
import { Resource } from '@opencloud-eu/web-client'
import { MenuSection } from './ContextActions'

/** So a fast save doesn't make the progress bar flicker. */
const MIN_SAVING_INDICATOR_DURATION = 1000

const {
  dropDownMenuSections = [],
  dropDownActionOptions = {
    space: null,
    resources: []
  },
  mainActions = [],
  resource = null,
  isSaving = false
} = defineProps<{
  dropDownMenuSections?: MenuSection[]
  dropDownActionOptions?: FileActionOptions
  mainActions?: Action[]
  resource?: Resource
  /** Shows the progress bar while the file is being saved. */
  isSaving?: boolean
}>()

defineEmits<{ (e: 'close'): void }>()

const { $gettext } = useGettext()
const resourcesStore = useResourcesStore()
const loadingService = useLoadingService()

const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)
const contextMenuLabel = computed(() => $gettext('Show context menu'))

const showSavingIndicator = ref(false)
let savingIndicatorShownAt = 0
let hideSavingIndicatorTimeout: ReturnType<typeof setTimeout>

watch(
  () => isSaving,
  (saving) => {
    clearTimeout(hideSavingIndicatorTimeout)
    if (saving) {
      if (!unref(showSavingIndicator)) {
        showSavingIndicator.value = true
        savingIndicatorShownAt = Date.now()
      }
      return
    }
    const remaining = savingIndicatorShownAt + MIN_SAVING_INDICATOR_DURATION - Date.now()
    if (remaining <= 0) {
      showSavingIndicator.value = false
      return
    }
    hideSavingIndicatorTimeout = setTimeout(() => {
      showSavingIndicator.value = false
    }, remaining)
  },
  { immediate: true }
)

let finishSavingTask: () => void
watch(showSavingIndicator, (saving) => {
  if (!saving) {
    finishSavingTask?.()
    return
  }
  loadingService.addTask(() => new Promise<void>((resolve) => (finishSavingTask = resolve)), {
    debounceTime: 0,
    warnBeforeUnload: false
  })
})

onBeforeUnmount(() => {
  clearTimeout(hideSavingIndicatorTimeout)
  finishSavingTask?.()
})
</script>
