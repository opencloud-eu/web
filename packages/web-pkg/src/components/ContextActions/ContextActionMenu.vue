<template>
  <div id="oc-files-context-menu">
    <oc-list
      v-for="(section, sectionIndex) in menuSections"
      :id="`oc-files-context-actions-${section.name}`"
      :key="`section-${section.name}-list`"
      class="oc-files-context-actions"
      :class="getSectionClasses(sectionIndex)"
    >
      <template v-if="section.items">
        <action-menu-item
          v-for="(action, actionIndex) in section.items"
          :key="`section-${section.name}-action-${actionIndex}`"
          :action="action"
          :appearance="appearance"
          :action-options="actionOptions"
          class="context-menu oc-files-context-action oc-rounded oc-menu-item-hover"
        />
      </template>
      <action-menu-drop-item
        v-if="section.drop && (section.drop.items?.length || section.drop.renderOnEmpty)"
        :menu-section-drop="section.drop"
        :appearance="appearance"
        :action-options="actionOptions"
      />
    </oc-list>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import ActionMenuItem from './ActionMenuItem.vue'
import { Action, ActionOptions } from '../../composables'
import { AppearanceType } from '@opencloud-eu/design-system/helpers'
import ActionMenuDropItem from './ActionMenuDropItem.vue'

export type MenuSectionDrop = {
  label: string
  name: string
  icon: string
  items?: Action[]
  renderOnEmpty?: boolean
  emptyMessage?: string
}

export type MenuSection = {
  name: string
  items?: Action[]
  drop?: MenuSectionDrop
}

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
        classes.push('oc-pb-s')
      }
      if (index > 0) {
        classes.push('oc-pt-s')
      }
      if (index < this.menuSections.length - 1) {
        classes.push('oc-files-context-actions-border')
      }
      return classes
    }
  }
})
</script>

<style lang="scss">
.oc-files-context-actions {
  text-align: left;
  white-space: normal;

  > li {
    padding-left: 0 !important;
    padding-right: 0 !important;

    a,
    button,
    span {
      display: inline-flex;
      font-weight: normal !important;
      justify-content: flex-start;
      vertical-align: top;
      width: 100%;
      text-align: left;
    }
  }

  &-border {
    border-bottom: 0.5px solid var(--oc-role-outline-variant);
  }
}
</style>
