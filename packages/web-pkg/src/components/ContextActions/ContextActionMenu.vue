<template>
  <div id="oc-files-context-menu">
    <oc-list
      v-for="(section, sectionIndex) in menuSections"
      :id="`oc-files-context-actions-${section.name}`"
      :key="`section-${section.name}-list`"
      class="[&_li]:px-0"
      :class="getSectionClasses(sectionIndex)"
    >
      <template v-if="section.items">
        <action-menu-item
          v-for="(action, actionIndex) in section.items"
          :key="`section-${section.name}-action-${actionIndex}`"
          :action="action"
          :appearance="appearance"
          :action-options="actionOptions"
          class="context-menu"
        />
      </template>
      <template v-for="drop in section.dropItems">
        <action-menu-drop-item
          v-if="drop.items.length"
          :key="drop.name"
          :menu-section-drop="drop"
          :appearance="appearance"
          :action-options="actionOptions"
        />
      </template>
    </oc-list>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import ActionMenuItem from './ActionMenuItem.vue'
import { ActionOptions } from '../../composables'
import { AppearanceType } from '@opencloud-eu/design-system/helpers'
import ActionMenuDropItem from './ActionMenuDropItem.vue'
import { MenuSection } from './types'

export default defineComponent({
  name: 'ContextActionMenu',
  components: { ActionMenuDropItem, ActionMenuItem },
  props: {
    menuSections: {
      type: Array as PropType<MenuSection[]>,
      required: true
    },
    appearance: {
      type: String as PropType<AppearanceType>,
      default: 'raw'
    },
    actionOptions: {
      type: Object as PropType<ActionOptions>,
      required: true
    }
  },
  methods: {
    getSectionClasses(index: number) {
      const classes: string[] = []
      if (!this.menuSections.length) {
        return classes
      }
      if (index < this.menuSections.length - 1) {
        classes.push('pb-2')
      }
      if (index > 0) {
        classes.push('pt-2')
      }
      if (index < this.menuSections.length - 1) {
        classes.push('border-b')
      }
      return classes
    }
  }
})
</script>
