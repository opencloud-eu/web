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
import { ActionMenuItem, useFileActions } from '@opencloud-eu/web-pkg'
import { computed, inject, Ref, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useFileActionsFavorite } from '../../../composables'

const resource = inject<Ref<Resource>>('resource')
const space = inject<Ref<SpaceResource>>('space')
const resources = computed(() => {
  return [unref(resource)]
})
const { getAllOpenWithActions } = useFileActions()
const { actions: favoriteActions } = useFileActionsFavorite()
const actions = computed(() => {
  const options = {
    space: unref(space),
    resources: unref(resources)
  }
  return [
    ...getAllOpenWithActions(options),
    /** FIXME: getAllOpenWithActions only contains system actions, which is a hardcoded subset of file actions, that live in web-pkg.
     * favoriteActions live in web-pkg, but are not in getAllOpenWithActions, so we have to add them manually.
     * We need to add an extension point for sidebar actions, instead of hardcoding them there **/
    ...unref(favoriteActions).filter((action) => action.isVisible(options))
  ]
})
</script>
