<template>
  <nav id="applications-menu" :aria-label="$gettext('Main navigation')" class="flex items-center">
    <oc-button
      id="_appSwitcherButton"
      v-oc-tooltip="applicationSwitcherLabel"
      appearance="raw-inverse"
      color-role="chrome"
      class="oc-topbar-menu-burger"
      :aria-label="applicationSwitcherLabel"
      no-hover
    >
      <oc-icon name="grid" size="large" class="flex" />
    </oc-button>
    <oc-drop
      :title="$gettext('Applications')"
      drop-id="app-switcher-dropdown"
      toggle="#_appSwitcherButton"
      mode="click"
      padding-size="small"
      close-on-click
      class="w-xs"
      @show-drop="updateAppIcons"
    >
      <div class="block relative">
        <oc-list class="applications-list">
          <li v-for="(n, nid) in sortedMenuItems" :key="`apps-menu-${nid}`">
            <oc-button
              :key="n.url ? 'apps-menu-external-link' : 'apps-menu-internal-link'"
              :appearance="isMenuItemActive(n) ? 'filled' : 'raw-inverse'"
              :color-role="isMenuItemActive(n) ? 'secondaryContainer' : 'surface'"
              justify-content="left"
              gap-size="large"
              :class="{ 'router-link-active': isMenuItemActive(n), active: isMenuItemActive(n) }"
              :data-test-id="n.id"
              v-bind="getAdditionalAttributes(n)"
              v-on="getAdditionalEventBindings(n)"
            >
              <oc-application-icon
                :key="`apps-menu-icon-${nid}-${appIconKey}`"
                :icon="n.icon || 'link'"
                :color-primary="n.color"
              />
              <span v-text="$gettext(n.label())" />
            </oc-button>
          </li>
        </oc-list>
      </div>
    </oc-drop>
  </nav>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, computed, unref, useTemplateRef } from 'vue'
import { OcDrop } from '@opencloud-eu/design-system/components'
import { useGettext } from 'vue3-gettext'
import { v4 as uuidV4 } from 'uuid'
import { AppMenuItemExtension, useRouter } from '@opencloud-eu/web-pkg'

export default defineComponent({
  props: {
    menuItems: {
      type: Array as PropType<AppMenuItemExtension[]>,
      required: false,
      default: (): AppMenuItemExtension[] => []
    }
  },
  setup(props) {
    const router = useRouter()
    const { $gettext } = useGettext()
    const appIconKey = ref('')

    const menu = useTemplateRef<typeof OcDrop>('menu')

    const activeRoutePath = computed(() => unref(router.currentRoute).path)
    const sortedMenuItems = computed(() => {
      return [...props.menuItems].sort(
        (a, b) => (a.priority || Number.MAX_SAFE_INTEGER) - (b.priority || Number.MAX_SAFE_INTEGER)
      )
    })

    const applicationSwitcherLabel = computed(() => {
      return $gettext('Application Switcher')
    })
    const updateAppIcons = () => {
      appIconKey.value = uuidV4().replaceAll('-', '')
    }

    const getAdditionalEventBindings = (item: AppMenuItemExtension) => {
      return item.handler ? { click: item.handler } : {}
    }
    const getAdditionalAttributes = (item: AppMenuItemExtension) => {
      let type: 'a' | 'button' | 'router-link'
      if (item.handler) {
        type = 'button'
      } else if (item.path) {
        type = 'router-link'
      } else {
        type = 'a'
      }

      return {
        type,
        ...(type === 'router-link' && { to: item.path }),
        ...(type === 'a' && { href: item.url, target: '_blank' as const })
      }
    }
    const isMenuItemActive = (item: AppMenuItemExtension) => {
      return unref(activeRoutePath)?.startsWith(item.path)
    }

    return {
      menu,
      sortedMenuItems,
      appIconKey,
      updateAppIcons,
      applicationSwitcherLabel,
      getAdditionalAttributes,
      getAdditionalEventBindings,
      isMenuItemActive
    }
  }
})
</script>
