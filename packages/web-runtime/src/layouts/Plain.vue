<template>
  <div class="oc-login h-screen" :style="backgroundImgStyle">
    <h1 class="sr-only" v-text="pageTitle" />
    <router-view class="relative z-1" />
    <img
      v-if="!backgroundImg && route.fullPath !== '/'"
      alt="OpenCloud emblem"
      src="/packages/design-system/src/assets/images/icon-lilac.svg"
      class="hidden sm:block fixed w-3xs xs:w-xs md:w-md lg:w-lg bottom-[-40px] right-[-40px]"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useRouteMeta, useThemeStore } from '@opencloud-eu/web-pkg'
import { useRoute } from 'vue-router'

const { $gettext } = useGettext()
const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const title = useRouteMeta('title')
const route = useRoute()

const pageTitle = computed(() => {
  return $gettext(unref(title) || '')
})
const backgroundImg = computed(() => unref(currentTheme).background)
const backgroundImgStyle = computed(() => {
  return unref(backgroundImg) ? { backgroundImage: `url(${unref(backgroundImg)})` } : {}
})
</script>
