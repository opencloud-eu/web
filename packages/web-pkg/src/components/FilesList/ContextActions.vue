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
  useFileActionsCopyPermanentLink,
  useFileActionsShowShares
} from '../../composables'
import { isNil } from 'lodash-es'
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

    const { actions: copyPermanentLinkActions } = useFileActionsCopyPermanentLink()
    const { actions: showSharesActions } = useFileActionsShowShares()

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
      unref(extensionsBatchActions)
        .filter((a) => a.category === 'actions' || isNil(a.category))
        .filter((item) => item.isVisible(unref(actionOptions)))
    )
    const menuItemsBatchSideBar = computed(() =>
      unref(extensionsBatchActions)
        .filter((a) => a.category === 'sidebar')
        .filter((item) => item.isVisible(unref(actionOptions)))
    )

    const menuItemsContext = computed(() => {
      return getAllOpenWithActions({ ...unref(actionOptions) })
        .filter((item) => item.isVisible(unref(actionOptions)))
        .sort((x, y) => Number(y.hasPriority) - Number(x.hasPriority))
    })

    const menuItemsContextDrop = computed(() => {
      return getAllOpenWithActions({ ...unref(actionOptions), omitSystemActions: true })
        .filter((item) => item.isVisible(unref(actionOptions)))
        .sort((x, y) => Number(y.hasPriority) - Number(x.hasPriority))
    })

    const menuItemsShare = computed(() => {
      return [
        ...unref(showSharesActions),
        ...unref(copyPermanentLinkActions),
        ...unref(extensionsContextActions).filter((a) => a.category === 'share')
      ].filter((item) => item.isVisible(unref(actionOptions)))
    })

    const menuItemsActions = computed(() => {
      return unref(extensionsContextActions)
        .filter((a) => a.category === 'actions' || isNil(a.category))
        .filter((item) => item.isVisible(unref(actionOptions)))
    })

    const menuItemsSidebar = computed(() => {
      return unref(extensionsContextActions)
        .filter((a) => a.category === 'sidebar')
        .filter((item) => item.isVisible(unref(actionOptions)))
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
          items: [...unref(menuItemsBatchSideBar)]
        })
        return sections
      }

      if ([...unref(menuItemsContext), ...unref(menuItemsContextDrop)].length) {
        sections.push({
          name: 'context',
          items: [...unref(menuItemsContext)],
          dropItems: [
            {
              label: $gettext('Open with...'),
              name: 'open-with',
              icon: 'apps',
              items: [...unref(menuItemsContextDrop)]
            }
          ]
        })
      }

      if (unref(menuItemsShare).length) {
        sections.push({
          name: 'share',
          items: unref(menuItemsShare)
        })
      }
      if (unref(menuItemsActions).length) {
        sections.push({
          name: 'actions',
          items: unref(menuItemsActions)
        })
      }
      if (unref(menuItemsSidebar).length) {
        sections.push({
          name: 'sidebar',
          items: unref(menuItemsSidebar)
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
