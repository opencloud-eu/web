<template>
  <li class="context-menu oc-files-context-action oc-px-s oc-rounded oc-menu-item-hover">
    <oc-button
      :id="toggleId"
      appearance="raw"
      gap-size="medium"
      class="oc-width-1-1 oc-flex-justify-between oc-width-1-1"
    >
      <oc-icon :name="menuSectionDrop.icon" size="medium" fill-type="line" />
      <span class="oc-flex oc-files-context-action-label">
        <span v-text="menuSectionDrop.label" />
      </span>
      <oc-icon name="arrow-right-s" size="small" fill-type="line" />
    </oc-button>
    <oc-drop
      :drop-id="dropId"
      :toggle="`#${toggleId}`"
      :is-nested="true"
      mode="hover"
      class="oc-width-auto oc-files-context-action-drop"
      padding-size="small"
      position="auto-start"
      close-on-click
    >
      <template v-if="menuSectionDrop.items.length">
        <action-menu-item
          v-for="(action, actionIndex) in menuSectionDrop.items"
          :key="`section-${menuSectionDrop.label}-action-${actionIndex}`"
          :action="action"
          :appearance="appearance"
          :action-options="actionOptions"
          class="oc-files-context-action oc-rounded oc-menu-item-hover"
        />
      </template>
    </oc-drop>
  </li>
</template>

<script setup lang="ts">
import ActionMenuItem from './ActionMenuItem.vue'
import { AppearanceType, uniqueId } from '@opencloud-eu/design-system/helpers'
import type { ActionOptions } from '../../composables'
import { MenuSectionDrop } from './types'

const { menuSectionDrop, appearance, actionOptions } = defineProps<{
  menuSectionDrop: MenuSectionDrop
  appearance: AppearanceType
  actionOptions: ActionOptions
}>()

const dropId = uniqueId(`oc-files-context-actions-${menuSectionDrop.name}-drop-`)
const toggleId = uniqueId(`oc-files-context-actions-${menuSectionDrop.name}-toggle-`)
</script>
