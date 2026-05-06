<template>
  <oc-list id="oc-files-actions-sidebar" class="sidebar-actions-panel">
    <action-menu-item
      v-for="(action, index) in actions"
      :key="`action-${index}`"
      :action="action"
      :action-options="{ space, resources }"
    />
  </oc-list>
</template>

<script setup lang="ts">
import { ActionMenuItem, FileActionOptions, useFileActions } from '@opencloud-eu/web-pkg'
import { computed, inject, Ref, unref } from 'vue'
import { IncomingShareResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  useFileActionsCreateSpaceFromResource,
  useFileActionsFavorite,
  useFileActionsRename,
  useFileActionsToggleHideShare
} from '../../../composables'

const resource = inject<Ref<Resource>>('resource')
const space = inject<Ref<SpaceResource>>('space')
const resources = computed(() => {
  return [unref(resource)]
})
const { getAllOpenWithActions } = useFileActions()
const { actions: createSpaceFromResourceActions } = useFileActionsCreateSpaceFromResource()
const { actions: favoriteActions } = useFileActionsFavorite()
const { actions: renameActions } = useFileActionsRename()
const { actions: toggleHideShareActions } = useFileActionsToggleHideShare()
const actions = computed(() => {
  const options = {
    space: unref(space),
    resources: unref(resources)
  }
  const shareActionOptions = options as FileActionOptions<IncomingShareResource>

  return [
    ...getAllOpenWithActions(options),
    /** FIXME: getAllOpenWithActions only contains system actions, which is a hardcoded subset of file actions, that live in web-pkg.
     * We need to add an extension point for sidebar actions, instead of hardcoding them **/
    ...unref(renameActions).filter((action) => action.isVisible(options)),
    ...unref(createSpaceFromResourceActions).filter((action) => action.isVisible(options)),
    ...unref(favoriteActions).filter((action) => action.isVisible(options)),
    ...unref(toggleHideShareActions).filter((action) => action.isVisible(shareActionOptions))
  ]
})
</script>
