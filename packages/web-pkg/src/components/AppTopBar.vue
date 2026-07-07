<template>
  <div
    class="oc-app-top-bar self-center flex col-[1/3] row-1 sm:col-2 [&_.parent-folder]:text-role-on-chrome"
  >
    <oc-button
      id="app-top-bar-close"
      appearance="raw-inverse"
      color-role="chrome"
      class="p-1"
      :aria-label="$gettext('Close')"
      @click="$emit('close')"
    >
      <oc-icon name="arrow-left-s" fill-type="line" />
    </oc-button>
    <div
      class="pr-1 my-2 mx-auto sm:m-0 inline-flex items-center bg-role-chrome rounded-lg h-10 gap-2 w-full sm:w-fit"
    >
      <div class="open-file-bar flex">
        <resource-list-item
          v-if="resource"
          id="app-top-bar-resource"
          class="[&_.oc-resource-name]:max-w-16 sm:[&_.oc-resource-name]:max-w-60 [&_span]:flex"
          :is-thumbnail-displayed="false"
          :is-extension-displayed="areFileExtensionsShown"
          :resource="resource"
          :is-favorite-displayed="false"
          :is-resource-clickable="false"
        />
      </div>
      <div class="flex">
        <span
          v-if="hasAutosave && !isReadOnly"
          class="hidden sm:flex items-center"
          data-testid="autosave-indicator"
        >
          <oc-icon
            v-oc-tooltip="autoSaveTooltipText"
            :accessible-label="autoSaveTooltipText"
            name="refresh"
            color="var(--oc-role-on-chrome)"
            class="ox-p-xs mx-1"
          />
        </span>
        <template v-if="mainActions.length && resource">
          <context-action-menu
            :menu-sections="[
              {
                name: 'main-actions',
                items: mainActions
                  .filter((action) => action.isVisible())
                  .map((action) => {
                    return {
                      ...action,
                      class: 'p-1 text-role-on-chrome [&_svg]:!fill-role-on-chrome',
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
        </template>
        <template v-if="dropDownMenuSections.length">
          <oc-button
            id="oc-openfile-contextmenu-trigger"
            v-oc-tooltip="contextMenuLabel"
            :aria-label="contextMenuLabel"
            appearance="raw-inverse"
            color-role="chrome"
            class="p-1"
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
import { computed } from 'vue'
import ContextActionMenu from './ContextActions/ContextActionMenu.vue'
import { useGettext } from 'vue3-gettext'
import { Action, FileActionOptions, useConfigStore, useResourcesStore } from '../composables'
import ResourceListItem from './FilesList/ResourceListItem.vue'
import { Resource } from '@opencloud-eu/web-client'
import { Duration } from 'luxon'
import { MenuSection } from './ContextActions'

const {
  dropDownMenuSections = [],
  dropDownActionOptions = {
    space: null,
    resources: []
  },
  mainActions = [],
  hasAutoSave = true,
  isEditor = false,
  resource = null,
  isReadOnly = true
} = defineProps<{
  dropDownMenuSections?: MenuSection[]
  dropDownActionOptions?: FileActionOptions
  mainActions?: Action[]
  hasAutoSave?: boolean
  isEditor?: boolean
  resource?: Resource
  isReadOnly?: boolean
}>()

defineEmits<{ (e: 'close'): void }>()

const { $gettext, current: currentLanguage } = useGettext()
const resourcesStore = useResourcesStore()
const configStore = useConfigStore()

const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)
const contextMenuLabel = computed(() => $gettext('Show context menu'))
const hasAutosave = computed(
  () => isEditor && hasAutoSave && configStore.options.editor.autosaveEnabled
)
const autoSaveTooltipText = computed(() => {
  const duration = Duration.fromObject(
    { seconds: configStore.options.editor.autosaveInterval },
    { locale: currentLanguage }
  )
  return $gettext(`Autosave (every %{ duration })`, { duration: duration.toHuman() })
})
</script>
