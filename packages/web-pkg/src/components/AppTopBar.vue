<template>
  <portal to="app.runtime.header.left">
    <div class="oc-app-top-bar self-center flex col-[1/4] row-2 sm:col-2 sm:row-1">
      <div
        class="pl-4 pr-1 my-2 mx-auto sm:m-0 inline-flex items-center justify-between bg-role-chrome border border-role-on-chrome rounded-lg h-10 gap-4 w-full sm:w-fit"
      >
        <div class="open-file-bar flex">
          <resource-list-item
            v-if="resource"
            id="app-top-bar-resource"
            class="[&_.oc-resource-name]:max-w-60 xs:[&_.oc-resource-name]:max-w-full sm:[&_.oc-resource-name]:max-w-20 md:[&_.oc-resource-name]:max-w-60 [&_svg]:!fill-role-on-chrome"
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

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
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

export default defineComponent({
  name: 'AppTopBar',
  components: {
    ContextActionMenu,
    ResourceListItem
  },
  props: {
    dropDownMenuSections: {
      type: Array as PropType<MenuSection[]>,
      default: (): MenuSection[] => []
    },
    dropDownActionOptions: {
      type: Object as PropType<FileActionOptions>,
      default: (): FileActionOptions => ({
        space: null,
        resources: []
      })
    },
    mainActions: {
      type: Array as PropType<Action[]>,
      default: (): Action[] => []
    },
    hasAutoSave: {
      type: Boolean,
      default: true
    },
    isEditor: {
      type: Boolean,
      default: false
    },
    resource: {
      type: Object as PropType<Resource>,
      default: null
    }
  },
  emits: ['close'],
  setup(props) {
    const { $gettext, current: currentLanguage } = useGettext()
    const resourcesStore = useResourcesStore()
    const configStore = useConfigStore()
    const { getMatchingSpace } = useGetMatchingSpace()

    const areFileExtensionsShown = computed(() => resourcesStore.areFileExtensionsShown)
    const contextMenuLabel = computed(() => $gettext('Show context menu'))
    const hasAutosave = computed(
      () => props.isEditor && props.hasAutoSave && configStore.options.editor.autosaveEnabled
    )
    const autoSaveTooltipText = computed(() => {
      const duration = Duration.fromObject(
        { seconds: configStore.options.editor.autosaveInterval },
        { locale: currentLanguage }
      )
      return $gettext(`Autosave (every %{ duration })`, { duration: duration.toHuman() })
    })

    const space = computed(() => getMatchingSpace(props.resource))

    const isPathDisplayed = computed(() => {
      return !isPublicSpaceResource(unref(space))
    })

    return {
      contextMenuLabel,
      areFileExtensionsShown,
      hasAutosave,
      autoSaveTooltipText,
      isPathDisplayed,
      ...useFolderLink()
    }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .oc-app-top-bar .oc-resource-indicators .text,
  #app-top-bar-resource .oc-resource-name span {
    @apply text-role-on-chrome;
  }
}
</style>
