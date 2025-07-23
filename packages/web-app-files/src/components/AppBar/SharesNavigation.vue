<template>
  <nav id="shares-navigation" class="oc-py-s" :aria-label="$gettext('Shares pages navigation')">
    <oc-list class="oc-flex oc-visible@s">
      <li v-for="navItem in navItems" :key="`shares-navigation-desktop-${navItem.to}`">
        <oc-button
          type="router-link"
          class="oc-mr-m oc-py-s shares-nav-desktop"
          appearance="raw"
          :to="navItem.to"
        >
          <oc-icon size="small" :name="navItem.icon" />
          <span v-text="navItem.text" />
        </oc-button>
      </li>
    </oc-list>
    <div id="shares-navigation-mobile" class="oc-hidden@s">
      <oc-button id="shares_navigation_mobile" class="oc-p-xs" appearance="raw">
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
              class="shares-nav-mobile"
              :to="navItem.to"
              :class="{ 'oc-secondary-container': navItem.active }"
              appearance="raw"
            >
              <span class="icon-box" :class="{ 'icon-box-active': navItem.active }">
                <oc-icon :name="navItem.icon" />
              </span>
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
<style lang="scss" scoped>
#shares-navigation {
  &-mobile {
    li {
      margin: var(--oc-space-xsmall) 0;

      &:first-child {
        margin-top: 0;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  a {
    gap: var(--oc-space-small);
    width: 100%;

    &:focus,
    &:hover {
      text-decoration: none;
    }

    &.shares-nav-mobile {
      justify-content: flex-start;
    }

    .icon-box {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 40px;
      height: 40px;
    }
  }

  .shares-nav-desktop.router-link-active {
    border-bottom: 2px solid var(--oc-role-secondary-container) !important;
    border-radius: 0;
  }
}
</style>
