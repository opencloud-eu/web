<template>
  <div
    id="web"
    class="bg-role-chrome h-dvh max-h-dvh overflow-y-hidden [&_.mark-highlight]:font-semibold"
  >
    <oc-hidden-announcer :announcement="announcement" level="polite" />
    <skip-to target="web-content-main">
      <span v-text="$gettext('Skip to main')" />
    </skip-to>
    <component :is="layout"></component>
    <modal-wrapper />
  </div>
</template>
<script setup lang="ts">
import SkipTo from './components/SkipTo.vue'
import ModalWrapper from './components/ModalWrapper.vue'
import { useLayout } from './composables/layout'
import { computed, onMounted, ref, unref, watch } from 'vue'
import { additionalTranslations } from './helpers/additionalTranslations' // eslint-disable-line
import {
  eventBus,
  useResourcesStore,
  useRouter,
  useSideBar,
  useThemeStore
} from '@opencloud-eu/web-pkg'
import { useHead } from './composables/head'
import { RouteLocation, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { isEqual } from 'lodash-es'

const resourcesStore = useResourcesStore()
const themeStore = useThemeStore()
const { $gettext } = useGettext()
const { currentTheme } = storeToRefs(themeStore)

const router = useRouter()
const route = useRoute()
useHead()
const { layout, layoutType } = useLayout({ router })

const { onInitialLoad } = useSideBar()
onInitialLoad()

const announcement = ref<string>()

const activeRoute = computed(() => router.resolve(unref(router.currentRoute)))

const extractPageTitleFromRoute = (route: RouteLocation) => {
  const routeTitle = route.meta.title ? $gettext(route.meta.title.toString()) : undefined
  if (!routeTitle) {
    return
  }
  const glue = ' - '
  const titleSegments = [routeTitle]
  return {
    shortDocumentTitle: titleSegments.join(glue),
    fullDocumentTitle: [...titleSegments, unref(currentTheme).name].join(glue)
  }
}

const announceRouteChange = (pageTitle: string) => {
  announcement.value = $gettext('Navigated to %{ pageTitle }', { pageTitle })
}

const getAppContextFromRoute = (route: RouteLocation): string[] => {
  return route?.path?.split('/').slice(1, 4)
}

onMounted(() => {
  eventBus.subscribe(
    'runtime.documentTitle.changed',
    ({
      shortDocumentTitle,
      fullDocumentTitle
    }: {
      shortDocumentTitle: string
      fullDocumentTitle: string
    }) => {
      document.title = fullDocumentTitle
      announceRouteChange(shortDocumentTitle)
    }
  )
})

watch(
  activeRoute,
  (newRoute, oldRoute) => {
    /**
     * Hide global loading spinner. It usually gets hidden after all apps
     * have been loaded, but in some scenarios (plain layouts) we never load them.
     */
    if (unref(layoutType) !== 'application') {
      const loader = document.getElementById('splash-loading')
      if (!loader?.classList.contains('splash-hide')) {
        loader.classList.add('splash-hide')
      }
    }

    const extracted = extractPageTitleFromRoute(unref(route))
    if (extracted) {
      const { shortDocumentTitle, fullDocumentTitle } = extracted
      announceRouteChange(shortDocumentTitle)
      document.title = fullDocumentTitle
    }

    // FIXME: this should be handled by the component(s) setting the current folder
    const oldAppContext = getAppContextFromRoute(oldRoute)
    const newAppContext = getAppContextFromRoute(newRoute)
    if (!isEqual(oldAppContext, newAppContext) && !('driveAliasAndItem' in newRoute.params)) {
      // if app context has been changed and no file context is set, we will reset current folder.
      resourcesStore.setCurrentFolder(null)
    }
  },
  { immediate: true }
)
</script>
