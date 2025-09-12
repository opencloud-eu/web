<template>
  <div
    class="bg-role-chrome h-dvh max-h-dvh overflow-y-hidden flex flex-col justify-center items-center"
  >
    <h1 class="sr-only" v-text="$gettext('Error')" />
    <oc-card
      :logo-url="logoImg"
      :title="$gettext('Missing or invalid config')"
      body-class="w-sm text-center"
      class="bg-role-surface-container rounded-lg"
    >
      <p v-text="$gettext('Please check if the file config.json exists and is correct.')" />
      <p v-text="$gettext('Also, make sure to check the browser console for more information.')" />
      <template #footer>
        <p v-text="footerSlogan" />
      </template>
    </oc-card>
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
