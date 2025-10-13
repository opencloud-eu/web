<template>
  <li class="context-menu px-2">
    <oc-button
      :id="toggleId"
      appearance="raw"
      justify-content="space-between"
      gap-size="medium"
      class="w-full flex justify-between"
      aria-expanded="false"
    >
      <span class="inline-flex gap-2">
        <oc-icon :name="menuSectionDrop.icon" size="medium" fill-type="line" />
        <span class="flex oc-files-context-action-label">
          <span v-text="menuSectionDrop.label" />
        </span>
      </span>
      <oc-icon name="arrow-right-s" size="small" fill-type="line" />
    </oc-button>
    <oc-drop
      :title="menuSectionDrop.label"
      :drop-id="dropId"
      :toggle="`#${toggleId}`"
      :is-nested-element="true"
      :nested-parent-ref="parentDropRef"
      mode="hover"
      class="w-3xs oc-files-context-action-drop"
      padding-size="small"
      position="auto-start"
      close-on-click
    >
      <template v-if="menuSectionDrop.items.length">
        <oc-list>
          <action-menu-item
            v-for="(action, actionIndex) in menuSectionDrop.items"
            :key="`section-${menuSectionDrop.label}-action-${actionIndex}`"
            :action="action"
            :appearance="appearance"
            :action-options="actionOptions"
          />
        </oc-list>
      </template>
    </oc-drop>
  </li>
</template>

<script setup lang="ts">
import ActionMenuItem from './ActionMenuItem.vue'
import { AppearanceType, NestedDrop, uniqueId } from '@opencloud-eu/design-system/helpers'
import type { ActionOptions } from '../../composables'
import { MenuSectionDrop } from './types'
import { OcDrop } from '@opencloud-eu/design-system/components'

const {
  menuSectionDrop,
  appearance,
  actionOptions,
  parentDropRef = null
} = defineProps<{
  menuSectionDrop: MenuSectionDrop
  appearance: AppearanceType
  actionOptions: ActionOptions
  parentDropRef?: NestedDrop | null
}>()

const dropId = uniqueId(`oc-files-context-actions-${menuSectionDrop.name}-drop-`)
const toggleId = uniqueId(`oc-files-context-actions-${menuSectionDrop.name}-toggle-`)
</script>
