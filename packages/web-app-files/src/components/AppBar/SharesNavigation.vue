<template>
  <nav id="shares-navigation" class="py-2" :aria-label="$gettext('Shares pages navigation')">
    <oc-list class="hidden sm:flex">
      <li v-for="navItem in navItems" :key="`shares-navigation-desktop-${navItem.to}`">
        <oc-button
          type="router-link"
          class="mr-4 py-2 w-full"
          :class="{ 'border-b-2 border-role-secondary-container rounded-none': navItem.active }"
          appearance="raw"
          :to="navItem.to"
        >
          <oc-icon size="small" :name="navItem.icon" />
          <span v-text="navItem.text" />
        </oc-button>
      </li>
    </oc-list>
    <div id="shares-navigation-mobile" class="block sm:hidden">
      <oc-button id="shares_navigation_mobile" class="p-1" appearance="raw">
        <span v-text="currentNavItem.text" />
        <oc-icon name="arrow-drop-down" />
      </oc-button>
      <oc-drop
        :title="$gettext('Navigation')"
        toggle="#shares_navigation_mobile"
        mode="click"
        close-on-click
        padding-size="small"
      >
        <oc-list>
          <li v-for="navItem in navItems" :key="`shares-navigation-mobile-${navItem.to}`">
            <oc-button
              type="router-link"
              justify-content="left"
              :to="navItem.to"
              :class="{ 'bg-role-secondary-container': navItem.active }"
              appearance="raw"
            >
              <oc-icon :name="navItem.icon" />
              <span v-text="navItem.text" />
            </oc-button>
          </li>
        </oc-list>
      </oc-drop>
    </div>
  </nav>
</template>

<script lang="ts">
import {
  isLocationSharesActive,
  locationSharesViaLink,
  locationSharesWithMe,
  locationSharesWithOthers,
  RouteShareTypes,
  useActiveLocation,
  useRouter
} from '@opencloud-eu/web-pkg'

import { computed, defineComponent, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { RouteRecordNormalized } from 'vue-router'

export default defineComponent({
  setup() {
    const { $gettext } = useGettext()
    const router = useRouter()
    const sharesRoutes = [
      locationSharesWithMe,
      locationSharesWithOthers,
      locationSharesViaLink
    ].reduce<Record<string, RouteRecordNormalized>>((routes, route) => {
      routes[route.name as string] = router.getRoutes().find((r) => r.name === route.name)
      return routes
    }, {})
    const sharesWithMeActive = useActiveLocation(
      isLocationSharesActive,
      locationSharesWithMe.name as RouteShareTypes
    )
    const sharesWithOthersActive = useActiveLocation(
      isLocationSharesActive,
      locationSharesWithOthers.name as RouteShareTypes
    )
    const sharesViaLinkActive = useActiveLocation(
      isLocationSharesActive,
      locationSharesViaLink.name as RouteShareTypes
    )
    const navItems = computed(() => [
      {
        icon: 'share-forward',
        to: sharesRoutes[locationSharesWithMe.name as string].path,
        text: $gettext('Shared with me'),
        active: unref(sharesWithMeActive)
      },
      {
        icon: 'reply',
        to: sharesRoutes[locationSharesWithOthers.name as string].path,
        text: $gettext('Shared with others'),
        active: unref(sharesWithOthersActive)
      },
      {
        icon: 'link',
        to: sharesRoutes[locationSharesViaLink.name as string].path,
        text: $gettext('Shared via link'),
        active: unref(sharesViaLinkActive)
      }
    ])
    const currentNavItem = computed(() => unref(navItems).find((navItem) => navItem.active))
    return {
      currentNavItem,
      navItems
    }
  }
})
</script>
