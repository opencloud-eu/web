<template>
  <div
    class="min-h-screen overflow-y-auto flex flex-col bg-gradient-to-br from-role-surface-container to-role-surface-container-highest dark:to-role-surface-container-lowest"
    :style="backgroundImgStyle"
  >
    <slot name="banner" />
    <h1 class="sr-only" v-text="title" />
    <div class="relative z-1 grow flex flex-col items-center justify-center gap-8 p-4">
      <img
        v-if="logoImg"
        :src="logoImg"
        alt=""
        :aria-hidden="true"
        class="h-8 sm:h-10 w-auto max-w-full"
      />
      <slot />
      <p
        v-if="footerSlogan"
        class="my-0 text-sm text-role-on-surface-variant text-center"
        v-text="footerSlogan"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'
import { useThemeStore } from '@opencloud-eu/web-pkg'
import { addVersionToAssetUrl } from '@opencloud-eu/design-system/helpers'

defineProps<{
  title: string
}>()

defineSlots<{
  default?: () => unknown
  banner?: () => unknown
}>()

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const backgroundImg = computed(() => unref(currentTheme)?.background)
const backgroundImgStyle = computed(() => {
  return unref(backgroundImg) ? { backgroundImage: `url(${unref(backgroundImg)})` } : {}
})
const logoImg = computed(() => {
  const logo = unref(currentTheme)?.logo
  return logo ? addVersionToAssetUrl(logo) : null
})
const footerSlogan = computed(() => unref(currentTheme)?.slogan)
</script>
