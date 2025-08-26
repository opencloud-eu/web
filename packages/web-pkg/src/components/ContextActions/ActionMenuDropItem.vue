<template>
  <li class="context-menu oc-files-context-action px-2 rounded-sm oc-menu-item-hover">
    <oc-button
      :id="toggleId"
      appearance="raw"
      gap-size="medium"
      class="w-full flex justify-between"
      aria-expanded="false"
    >
      <oc-icon :name="menuSectionDrop.icon" size="medium" fill-type="line" />
      <span class="flex oc-files-context-action-label">
        <span v-text="menuSectionDrop.label" />
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
      class="w-auto oc-files-context-action-drop"
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
            class="oc-files-context-action rounded-sm oc-menu-item-hover"
          />
        </oc-list>
      </template>
    </oc-drop>
  </li>
</template>

<script setup lang="ts">
import ActionMenuItem from './ActionMenuItem.vue'
import { AppearanceType, uniqueId } from '@opencloud-eu/design-system/helpers'
import type { ActionOptions } from '../../composables'
import { MenuSectionDrop } from './types'
import { OcDrop } from '@opencloud-eu/design-system/components'
import { Ref } from 'vue'

const {
  menuSectionDrop,
  appearance,
  actionOptions,
  parentDropRef = null
} = defineProps<{
  menuSectionDrop: MenuSectionDrop
  appearance: AppearanceType
  actionOptions: ActionOptions
  parentDropRef?: Ref<InstanceType<typeof OcDrop>>
}>()

const dropId = uniqueId(`oc-files-context-actions-${menuSectionDrop.name}-drop-`)
const toggleId = uniqueId(`oc-files-context-actions-${menuSectionDrop.name}-toggle-`)
</script>
