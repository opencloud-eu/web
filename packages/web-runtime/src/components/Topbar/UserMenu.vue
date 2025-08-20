<template>
  <nav :aria-label="$gettext('Account menu')">
    <oc-button
      id="_userMenuButton"
      ref="menuButton"
      v-oc-tooltip="$gettext('My Account')"
      class="oc-topbar-personal"
      appearance="raw"
      no-hover
      :aria-label="$gettext('My Account')"
    >
      <user-avatar
        v-if="onPremisesSamAccountName"
        class="oc-topbar-avatar oc-topbar-personal-avatar inline-flex justify-center items-center"
        :user-id="user.id"
        :user-name="user.displayName"
        background-color="var(--oc-role-on-chrome)"
        color="var(--oc-role-chrome)"
      />
      <oc-avatar-item
        v-else
        class="oc-topbar-avatar oc-topbar-unauthenticated-avatar inline-flex justify-center items-center"
        :name="$gettext('User Menu login')"
        :width="32"
        icon="user"
        icon-fill-type="line"
        icon-color="var(--oc-role-on-surface)"
        background="var(--oc-role-surface)"
      />
    </oc-button>
    <oc-drop
      ref="menu"
      :title="$gettext('Account')"
      drop-id="account-info-container"
      toggle="#_userMenuButton"
      mode="click"
      close-on-click
      padding-size="small"
      class="oc-overflow-hidden"
    >
      <oc-list class="user-menu-list">
        <template v-if="!onPremisesSamAccountName">
          <li>
            <oc-button
              id="oc-topbar-account-manage"
              type="router-link"
              :to="accountPageRoute"
              appearance="raw"
            >
              <oc-icon name="settings-4" fill-type="line" class="p-1" />
              <span v-text="$gettext('Preferences')" />
            </oc-button>
          </li>
          <li>
            <oc-button
              id="oc-topbar-account-login"
              appearance="raw"
              type="router-link"
              :to="loginLink"
            >
              <oc-icon name="login-box" fill-type="line" class="p-1" />
              <span v-text="$gettext('Log in')" />
            </oc-button>
          </li>
        </template>
        <template v-else>
          <li class="profile-info-wrapper pl-2">
            <user-avatar
              :user-id="user.id"
              :user-name="user.displayName"
              color="var(--oc-role-on-chrome)"
              background-color="var(--oc-role-chrome)"
            />
            <span class="profile-info-wrapper" :class="{ 'py-1': !user.mail }">
              <span class="oc-display-block" v-text="user.displayName" />
              <span v-if="user.mail" class="text-sm" v-text="user.mail" />
              <quota-information v-if="quotaEnabled" :quota="quota" class="text-sm mt-1" />
            </span>
          </li>
          <li>
            <oc-button
              id="oc-topbar-account-manage"
              type="router-link"
              :to="accountPageRoute"
              appearance="raw"
            >
              <oc-icon name="settings-4" fill-type="line" />
              <span v-text="$gettext('Preferences')" />
            </oc-button>
          </li>
          <li>
            <oc-button id="oc-topbar-account-logout" appearance="raw" @click="logout">
              <oc-icon name="logout-box-r" fill-type="line" />
              <span v-text="$gettext('Log out')" />
            </oc-button>
          </li>
        </template>
      </oc-list>
      <div v-if="showFooter" class="imprint-footer py-2 mt-4 mb-2 ml-2 text-center">
        <oc-button
          v-if="imprintUrl"
          type="a"
          appearance="raw"
          :href="imprintUrl"
          target="_blank"
          no-hover
        >
          <span v-text="$gettext('Imprint')" />
        </oc-button>
        <template v-if="privacyUrl">
          <span>·</span>
          <oc-button type="a" appearance="raw" :href="privacyUrl" target="_blank" no-hover>
            <span v-text="$gettext('Privacy')" />
          </oc-button>
        </template>
        <template v-if="accessibilityUrl">
          <span>·</span>
          <oc-button type="a" appearance="raw" :href="accessibilityUrl" target="_blank" no-hover>
            <span v-text="$gettext('Accessibility')" />
          </oc-button>
        </template>
      </div>
    </oc-drop>
  </nav>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'
import { ComponentPublicInstance, computed, defineComponent, unref } from 'vue'
import {
  routeToContextQuery,
  useAuthService,
  UserAvatar,
  useRoute,
  useSpacesStore,
  useThemeStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { OcDrop } from '@opencloud-eu/design-system/components'
import QuotaInformation from '../Account/QuotaInformation.vue'

export default defineComponent({
  components: { UserAvatar, QuotaInformation },
  setup() {
    const route = useRoute()
    const userStore = useUserStore()
    const themeStore = useThemeStore()
    const spacesStore = useSpacesStore()
    const authService = useAuthService()

    const { user } = storeToRefs(userStore)

    const accountPageRoute = computed(() => ({
      name: 'account',
      query: routeToContextQuery(unref(route))
    }))

    const loginLink = computed(() => {
      return {
        name: 'login',
        query: { redirectUrl: unref(route).fullPath }
      }
    })
    const logout = () => {
      authService.logoutUser()
    }

    const imprintUrl = computed(() => themeStore.currentTheme.urls.imprint)
    const privacyUrl = computed(() => themeStore.currentTheme.urls.privacy)
    const accessibilityUrl = computed(() => themeStore.currentTheme.urls.accessibility)

    const showFooter = computed(() => {
      return !!(unref(imprintUrl) || unref(privacyUrl) || unref(accessibilityUrl))
    })

    const quota = computed(() => {
      return spacesStore.personalSpace?.spaceQuota
    })

    return {
      user,
      accountPageRoute,
      loginLink,
      imprintUrl,
      privacyUrl,
      accessibilityUrl,
      showFooter,
      quota,
      logout
    }
  },
  computed: {
    onPremisesSamAccountName() {
      return this.user?.onPremisesSamAccountName
    },
    quotaEnabled() {
      return !!this.quota
    }
  },
  mounted() {
    ;(this.$refs.menu as InstanceType<typeof OcDrop>)?.tippy?.setProps({
      onHidden: () => (this.$refs.menuButton as ComponentPublicInstance).$el.focus(),
      onShown: () =>
        (this.$refs.menu as ComponentPublicInstance).$el.querySelector('a:first-of-type').focus()
    })
  }
})
</script>

<style lang="scss" scoped>
.user-menu-list li {
  align-items: center;
  display: flex;

  &.profile-info-wrapper {
    gap: var(--oc-space-medium);
    min-height: 3rem;
  }
}

.imprint-footer {
  background-color: var(--oc-role-surface-container);
  width: calc(100% + var(--oc-space-small) * 2);

  a {
    color: var(--oc-role-on-surface);
  }
}
</style>
