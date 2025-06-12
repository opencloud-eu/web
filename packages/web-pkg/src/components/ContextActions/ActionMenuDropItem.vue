<template>
  <li class="context-menu oc-files-context-action oc-px-s oc-rounded oc-menu-item-hover">
    <oc-button
      :id="`oc-files-context-actions-${menuSection.name}-toggle`"
      appearance="raw"
      gap-size="medium"
      class="oc-drop-nested-toggle oc-py-s oc-px-m oc-width-1-1 oc-flex-justify-between oc-width-1-1"
    >
      <oc-icon :name="menuSection.drop.icon" size="medium" fill-type="line" />
      <span class="oc-flex oc-files-context-action-label">
        <span v-text="menuSection.drop.label" />
      </span>
      <oc-icon name="arrow-right-s" size="small" fill-type="line" />
    </oc-button>
    <oc-drop
      :toggle="`#oc-files-context-actions-${menuSection.name}-toggle`"
      :is-nested="true"
      mode="hover"
      class="oc-width-auto"
      padding-size="small"
      position="auto-start"
      close-on-click
    >
      <template v-if="menuSection.drop.items.length">
        <action-menu-item
          v-for="(action, actionIndex) in menuSection.drop.items"
          :key="`section-${menuSection.name}-action-${actionIndex}`"
          :action="action"
          :appearance="appearance"
          :action-options="actionOptions"
          class="oc-files-context-action oc-rounded oc-menu-item-hover"
        />
      </template>
      <span
        v-else
        class="oc-py-s oc-px-m oc-text-muted"
        v-text="menuSection.drop.emptyMessage || $gettext('No items available')"
      />
    </oc-drop>
  </li>
</template>

<script setup lang="ts">
import ActionMenuItem from './ActionMenuItem.vue'
import type { AppearanceType } from '@opencloud-eu/design-system/helpers'
import type { ActionOptions } from '../../composables'
import type { MenuSection } from './ContextActionMenu.vue'

const { menuSection, appearance, actionOptions } = defineProps<{
  menuSection: MenuSection
  appearance: AppearanceType
  actionOptions: ActionOptions
}>()
</script>
