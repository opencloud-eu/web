<template>
  <context-action-menu :menu-sections="menuSections" :action-options="actionOptions" />
</template>

<script lang="ts">
import ContextActionMenu from '../ContextActions/ContextActionMenu.vue'
import { computed, defineComponent, PropType, Ref, toRef, unref } from 'vue'
import {
  ActionExtension,
  FileActionOptions,
  useExtensionRegistry,
  useFileActions,
  useFileActionsCopy,
  useFileActionsDelete,
  useFileActionsDisableSync,
  useFileActionsDownloadArchive,
  useFileActionsDownloadFile,
  useFileActionsEnableSync,
  useFileActionsMove,
  useFileActionsOpenWithDefault,
  useFileActionsRestore
} from '../../composables'
import { useGettext } from 'vue3-gettext'
import { MenuSection } from '../ContextActions'

export default defineComponent({
  name: 'ContextActions',
  components: { ContextActionMenu },
  props: {
    actionOptions: {
      type: Object as PropType<FileActionOptions>,
      required: true
    }
  },
  setup(props) {
    const { getAllOpenWithActions } = useFileActions()
    const { $gettext } = useGettext()

    const { actions: openWithDefaultActions } = useFileActionsOpenWithDefault()
    const { actions: enableSyncActions } = useFileActionsEnableSync()
    const { actions: copyActions } = useFileActionsCopy()
    const { actions: disableSyncActions } = useFileActionsDisableSync()
    const { actions: deleteActions } = useFileActionsDelete()
    const { actions: downloadArchiveActions } = useFileActionsDownloadArchive()
    const { actions: downloadFileActions } = useFileActionsDownloadFile()
    const { actions: moveActions } = useFileActionsMove()
    const { actions: restoreActions } = useFileActionsRestore()

    const extensionRegistry = useExtensionRegistry()
    const extensionsContextActions = computed(() => {
      return extensionRegistry
        .requestExtensions<ActionExtension>({
          id: 'global.files.context-actions',
          extensionType: 'action'
        })
        .map((e) => e.action)
    })
    const extensionsBatchActions = computed(() => {
      return extensionRegistry
        .requestExtensions<ActionExtension>({
          id: 'global.files.batch-actions',
          extensionType: 'action'
        })
        .map((e) => e.action)
    })

    // type cast to make vue-tsc aware of the type
    const actionOptions = toRef(props, 'actionOptions') as Ref<FileActionOptions>

    const menuItemsBatchActions = computed(() =>
      [
        ...unref(enableSyncActions),
        ...unref(disableSyncActions),
        ...unref(downloadArchiveActions),
        ...unref(moveActions),
        ...unref(copyActions),
        ...unref(deleteActions),
        ...unref(restoreActions),
        ...unref(extensionsBatchActions).filter((a) => a.category === 'tertiary')
      ].filter((item) => item.isVisible(unref(actionOptions)))
    )
    const menuItemsBatchQuaternary = computed(() =>
      [...unref(extensionsBatchActions).filter((a) => a.category === 'quaternary')].filter((item) =>
        item.isVisible(unref(actionOptions))
      )
    )

    const menuItemsPrimary = computed(() => {
      return unref(openWithDefaultActions)
        .filter((item) => item.isVisible(unref(actionOptions)))
        .sort((x, y) => Number(y.hasPriority) - Number(x.hasPriority))
    })

    const menuItemsPrimaryDrop = computed(() => {
      return getAllOpenWithActions({ ...unref(actionOptions), omitSystemActions: true })
        .filter((item) => item.isVisible(unref(actionOptions)))
        .sort((x, y) => Number(y.hasPriority) - Number(x.hasPriority))
    })

    const menuItemsSecondary = computed(() => {
      return [...unref(extensionsContextActions).filter((a) => a.category === 'secondary')].filter(
        (item) => item.isVisible(unref(actionOptions))
      )
    })

    const menuItemsTertiary = computed(() => {
      return [
        ...unref(downloadArchiveActions),
        ...unref(downloadFileActions),
        ...unref(deleteActions),
        ...unref(moveActions),
        ...unref(copyActions),
        ...unref(restoreActions),
        ...unref(enableSyncActions),
        ...unref(disableSyncActions),
        ...unref(extensionsContextActions).filter((a) => !a.category || a.category === 'tertiary')
      ].filter((item) => item.isVisible(unref(actionOptions)))
    })

    const menuItemsQuaternary = computed(() => {
      return [...unref(extensionsContextActions).filter((a) => a.category === 'quaternary')].filter(
        (item) => item.isVisible(unref(actionOptions))
      )
    })

    const menuSections = computed(() => {
      const sections: MenuSection[] = []
      if (unref(actionOptions).resources.length > 1) {
        if (unref(menuItemsBatchActions).length) {
          sections.push({
            name: 'batch-actions',
            items: [...unref(menuItemsBatchActions)]
          })
        }

        sections.push({
          name: 'batch-details',
          items: [...unref(menuItemsBatchQuaternary)]
        })
        return sections
      }

      if ([...unref(menuItemsPrimary), ...unref(menuItemsPrimaryDrop)].length) {
        sections.push({
          name: 'primary',
          items: [...unref(menuItemsPrimary)],
          dropItems: [
            {
              label: $gettext('Open with...'),
              name: 'open-with',
              icon: 'apps',
              items: [...unref(menuItemsPrimaryDrop)]
            }
          ]
        })
      }

      if (unref(menuItemsSecondary).length) {
        sections.push({
          name: 'secondary',
          items: unref(menuItemsSecondary)
        })
      }
      if (unref(menuItemsTertiary).length) {
        sections.push({
          name: 'tertiary',
          items: unref(menuItemsTertiary)
        })
      }
      if (unref(menuItemsQuaternary).length) {
        sections.push({
          name: 'quaternary',
          items: unref(menuItemsQuaternary)
        })
      }
      return sections
    })

    return {
      menuSections
    }
  }
})
</script>
