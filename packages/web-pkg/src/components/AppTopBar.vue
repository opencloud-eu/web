<template>
  <portal to="app.runtime.header.left">
    <div
      class="oc-app-top-bar self-center flex col-[1/4] row-2 sm:col-2 sm:row-1 [&_.parent-folder]:text-role-on-chrome"
    >
      <div
        class="pl-4 pr-1 my-2 mx-auto sm:m-0 inline-flex items-center justify-between bg-role-chrome border border-role-on-chrome rounded-lg h-10 gap-4 w-full sm:w-fit"
      >
        <div class="open-file-bar flex">
          <resource-list-item
            v-if="resource"
            id="app-top-bar-resource"
            class="[&_.oc-resource-name]:max-w-60 xs:[&_.oc-resource-name]:max-w-full sm:[&_.oc-resource-name]:max-w-20 md:[&_.oc-resource-name]:max-w-60 [&_svg]:!fill-role-on-chrome [&_span]:text-role-on-chrome"
            :is-thumbnail-displayed="false"
            :is-extension-displayed="areFileExtensionsShown"
            :path-prefix="getPathPrefix(resource)"
            :resource="resource"
            :parent-folder-name="getParentFolderName(resource)"
            :parent-folder-link-icon-additional-attributes="
              getParentFolderLinkIconAdditionalAttributes(resource)
            "
            :is-path-displayed="isPathDisplayed"
            :is-resource-clickable="false"
          />
        </div>
        <div class="flex">
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
          <span v-if="hasAutosave" class="flex items-center">
            <oc-icon
              v-oc-tooltip="autoSaveTooltipText"
              :accessible-label="autoSaveTooltipText"
              name="refresh"
              color="white"
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
                        class:
                          'p-1 text-role-on-chrome [&_svg]:!fill-role-on-chrome [&:hover:not(:disabled)_svg]:!fill-role-chrome',
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
          <oc-button
            id="app-top-bar-close"
            appearance="raw-inverse"
            color-role="chrome"
            class="p-1"
            :aria-label="$gettext('Close')"
            @click="$emit('close')"
          >
            <oc-icon name="close" />
          </oc-button>
        </div>
      </div>
    </div>
  </portal>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import ContextActionMenu from './ContextActions/ContextActionMenu.vue'
import { useGettext } from 'vue3-gettext'
import {
  Action,
  FileActionOptions,
  useConfigStore,
  useFolderLink,
  useGetMatchingSpace,
  useResourcesStore
} from '../composables'
import ResourceListItem from './FilesList/ResourceListItem.vue'
import { isPublicSpaceResource, Resource } from '@opencloud-eu/web-client'
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
  resource = null
} = defineProps<{
  dropDownMenuSections?: MenuSection[]
  dropDownActionOptions?: FileActionOptions
  mainActions?: Action[]
  hasAutoSave?: boolean
  isEditor?: boolean
  resource?: Resource
}>()

defineEmits<{ (e: 'close'): void }>()

const { $gettext, current: currentLanguage } = useGettext()
const resourcesStore = useResourcesStore()
const configStore = useConfigStore()
const { getMatchingSpace } = useGetMatchingSpace()
const { getParentFolderName, getPathPrefix, getParentFolderLinkIconAdditionalAttributes } =
  useFolderLink()

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

const space = computed(() => getMatchingSpace(resource))

const isPathDisplayed = computed(() => {
  return !isPublicSpaceResource(unref(space))
})
</script>
