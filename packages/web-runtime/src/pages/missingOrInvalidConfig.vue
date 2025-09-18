<template>
  <div
    class="bg-role-chrome h-dvh max-h-dvh overflow-y-hidden flex flex-col justify-center items-center"
  >
    <h1 class="sr-only" v-text="$gettext('Error')" />
    <oc-card
      :logo-url="logoImg"
      :title="$gettext('Missing or invalid config')"
      body-class="text-center"
      class="bg-role-surface-container rounded-lg"
    >
      <p v-text="$gettext('Please check if the file config.json exists and is correct.')" />
      <p v-text="$gettext('Also, make sure to check the browser console for more information.')" />
      <template #footer>
        <p v-if="footerSlogan" v-text="footerSlogan" />
      </template>
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useThemeStore } from '@opencloud-eu/web-pkg'
import { useHead } from '../composables/head'
import { storeToRefs } from 'pinia'
// import ods component because ods is not initialized in case of a missing or invalid config
import { OcCard } from '@opencloud-eu/design-system/components'

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const logoImg = computed(() => unref(currentTheme)?.logo)
const footerSlogan = computed(() => unref(currentTheme)?.slogan)

useHead()
</script>
