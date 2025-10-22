<template>
  <div class="h-screen flex flex-col justify-center items-center p-4">
    <oc-card
      :logo-url="logoImg"
      :title="cardTitle"
      body-class="text-center"
      header-class="text-center"
      class="w-full sm:w-sm rounded-lg"
    >
      <p v-text="cardHint" />
      <oc-button
        v-if="accessDeniedHelpUrl"
        type="a"
        appearance="raw"
        :href="accessDeniedHelpUrl"
        target="_blank"
        no-hover
      >
        <span v-text="$gettext('Read more')" />
      </oc-button>
      <template #footer>
        <p v-text="footerSlogan" />
      </template>
    </oc-card>
    <oc-button
      id="exitAnchor"
      class="mt-4 w-full sm:w-sm"
      size="large"
      appearance="filled"
      color-role="primary"
      v-bind="logoutButtonsAttrs"
    >
      {{ navigateToLoginText }}
    </oc-button>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import {
  queryItemAsString,
  useConfigStore,
  useRouteQuery,
  useThemeStore
} from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'AccessDeniedPage',
  setup() {
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)
    const configStore = useConfigStore()
    const redirectUrlQuery = useRouteQuery('redirectUrl')

    const { $gettext } = useGettext()

    const accessDeniedHelpUrl = computed(() => unref(currentTheme).urls?.accessDeniedHelp)
    const footerSlogan = computed(() => unref(currentTheme).slogan)
    const logoImg = computed(() => unref(currentTheme).logo)

    const cardTitle = computed(() => {
      return $gettext('Not logged in')
    })
    const cardHint = computed(() => {
      return $gettext(
        'This could be because of a routine safety log out, or because your account is either inactive or not yet authorized for use. Please try logging in after a while or seek help from your Administrator.'
      )
    })
    const navigateToLoginText = computed(() => {
      return $gettext('Log in again')
    })
    const logoutButtonsAttrs = computed(() => {
      const redirectUrl = queryItemAsString(unref(redirectUrlQuery))
      if (configStore.options.loginUrl) {
        const configLoginURL = new URL(encodeURI(configStore.options.loginUrl))
        if (redirectUrl) {
          configLoginURL.searchParams.append('redirectUrl', redirectUrl)
        }
        return {
          type: 'a' as const,
          href: configLoginURL.toString()
        }
      }
      return {
        type: 'router-link' as const,
        to: {
          name: 'login',
          query: {
            ...(redirectUrl && { redirectUrl })
          }
        }
      }
    })

    return {
      logoImg,
      cardTitle,
      cardHint,
      footerSlogan,
      navigateToLoginText,
      accessDeniedHelpUrl,
      logoutButtonsAttrs
    }
  }
})
</script>
