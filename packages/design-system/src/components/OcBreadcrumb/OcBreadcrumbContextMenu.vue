<template>
  <oc-button
    :id="triggerId"
    v-oc-tooltip="label"
    :aria-label="label"
    appearance="raw"
    no-hover
    class="oc-breadcrumb-contextmenu-trigger mx-1 shrink-0"
  >
    <oc-icon name="more-2" color="var(--oc-role-on-surface)" class="align-middle" />
  </oc-button>
  <oc-drop
    :drop-id="dropId"
    :title="title"
    :toggle="`#${triggerId}`"
    mode="click"
    close-on-click
    :padding-size="paddingSize"
  >
    <slot />
  </oc-drop>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SizeType, uniqueId } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcDrop from '../OcDrop/OcDrop.vue'
import OcIcon from '../OcIcon/OcIcon.vue'

export interface Props {
  /**
   * @docs The padding size of the context menu dropdown.
   * @default medium
   */
  paddingSize?: SizeType | 'remove'
  /**
   * @docs The title of the context menu dropdown, only displayed in the bottom drawer in the mobile view.
   */
  title?: string
}

export interface Slots {
  /**
   * @docs The context actions that open in a dropdown when clicking the trigger.
   */
  default?: () => unknown
}

const { paddingSize = 'medium', title = '' } = defineProps<Props>()
defineSlots<Slots>()

const { $gettext } = useGettext()

const triggerId = uniqueId('oc-breadcrumb-contextmenu-trigger-')
const dropId = uniqueId('oc-breadcrumb-contextmenu-')

const label = computed(() => $gettext('Show actions for current folder'))
</script>
