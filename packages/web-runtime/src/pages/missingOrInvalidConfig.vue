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
import { computed, defineComponent } from 'vue'
import { useThemeStore } from '@opencloud-eu/web-pkg'
import { useHead } from '../composables/head'
import { storeToRefs } from 'pinia'
import { $gettext } from '@opencloud-eu/web-pkg/src/router/utils'

export default defineComponent({
  name: 'MissingConfigPage',
  setup() {
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)

    const logoImg = computed(() => currentTheme.value?.logo?.login)
    const footerSlogan = computed(() => currentTheme.value?.common?.slogan)

    useHead()

    return {
      logoImg,
      footerSlogan
    }
  },
  methods: { $gettext }
})
</script>
