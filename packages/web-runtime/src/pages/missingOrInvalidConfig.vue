<template>
  <div class="oc-login-card oc-position-center">
    <img class="oc-login-logo" :src="logoImg" alt="" :aria-hidden="true" />
    <div class="oc-login-card-body">
      <h1 class="oc-login-card-title" v-text="$gettext('Missing or invalid config')" />
      <p v-text="$gettext('Please check if the file config.json exists and is correct.')" />
      <p v-text="$gettext('Also, make sure to check the browser console for more information.')" />
    </div>
    <div class="oc-login-card-footer">
      <p>
        {{ footerSlogan }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, unref } from 'vue'
import { useThemeStore } from '@opencloud-eu/web-pkg'
import { useHead } from '../composables/head'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'MissingConfigPage',
  setup() {
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)

    const logoImg = computed(() => unref(currentTheme)?.logo)
    const footerSlogan = computed(() => unref(currentTheme)?.slogan)

    useHead()

    return {
      logoImg,
      footerSlogan
    }
  }
})
</script>
