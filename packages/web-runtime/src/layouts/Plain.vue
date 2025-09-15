<template>
  <div class="oc-login h-screen" :style="backgroundImgStyle">
    <h1 class="sr-only" v-text="pageTitle" />
    <router-view />
    <img
      v-if="!backgroundImg"
      alt="OpenCloud emblem"
      src="/packages/design-system/src/assets/images/icon-lilac.svg"
    />
  </div>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'
import { computed, defineComponent, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useRouteMeta, useThemeStore } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'PlainLayout',
  setup() {
    const { $gettext } = useGettext()
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)

    const title = useRouteMeta('title')

    const pageTitle = computed(() => {
      return $gettext(unref(title) || '')
    })
    const backgroundImg = computed(() => unref(currentTheme).background)
    const backgroundImgStyle = computed(() => {
      return unref(backgroundImg) ? { backgroundImage: `url(${unref(backgroundImg)})` } : {}
    })

    return {
      pageTitle,
      backgroundImg,
      backgroundImgStyle
    }
  }
})
</script>
