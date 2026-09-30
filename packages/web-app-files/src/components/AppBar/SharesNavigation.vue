<template>
  <nav
    id="shares-navigation"
    class="mb-2 -mx-4 px-4 border-b"
    :aria-label="$gettext('Shares pages navigation')"
  >
    <oc-list class="hidden sm:flex gap-4">
      <li v-for="navItem in navItems" :key="`shares-navigation-desktop-${navItem.to}`">
        <oc-button
          :type="navItem.active ? 'button' : 'router-link'"
          class="py-2 w-full m-0"
          :class="{ 'border-b border-role-secondary rounded-none font-bold': navItem.active }"
          appearance="raw"
          :to="navItem.active ? undefined : navItem.to"
          no-hover
          @click="reloadList"
        >
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
              :type="navItem.active ? 'button' : 'router-link'"
              justify-content="left"
              :to="navItem.active ? undefined : navItem.to"
              :class="{ 'bg-role-secondary-container': navItem.active }"
              appearance="raw"
              @click="reloadList"
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

<script setup lang="ts">
import {
  eventBus,
  isLocationSharesActive,
  locationSharesViaLink,
  locationSharesWithMe,
  locationSharesWithOthers,
  RouteShareTypes,
  useActiveLocation,
  useRouter
} from '@opencloud-eu/web-pkg'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { RouteRecordNormalized } from 'vue-router'

const { $gettext } = useGettext()
const router = useRouter()
const sharesRoutes = [locationSharesWithMe, locationSharesWithOthers, locationSharesViaLink].reduce<
  Record<string, RouteRecordNormalized>
>((routes, route) => {
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

// the active item is rendered as a button because navigating to the current route
// is a no-op in the router, so clicking it reloads the list instead
function reloadList() {
  eventBus.publish('app.files.list.load')
}
</script>
