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
    <div id="app-runtime-drop" />
  </div>
</template>
<script setup lang="ts">
import SkipTo from './components/SkipTo.vue'
import ModalWrapper from './components/ModalWrapper.vue'
import { useLayout } from './composables/layout'
import { onMounted, ref, unref } from 'vue'
import { additionalTranslations } from './helpers/additionalTranslations' // eslint-disable-line
import {
  eventBus,
  isLocationSpacesActive,
  useRouter,
  useSideBar,
  useThemeStore
} from '@opencloud-eu/web-pkg'
import { RouteLocation, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'

const themeStore = useThemeStore()
const { $gettext } = useGettext()
const { currentTheme } = storeToRefs(themeStore)

const router = useRouter()
const route = useRoute()
const { layout, layoutType } = useLayout({ router })

const { onInitialLoad } = useSideBar()
onInitialLoad()

const announcement = ref<string>()

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

function announceRouteChange({
  shortDocumentTitle,
  fullDocumentTitle
}: {
  shortDocumentTitle: string
  fullDocumentTitle: string
}) {
  document.title = fullDocumentTitle
  announcement.value = $gettext('Navigated to %{ pageTitle }', { pageTitle: shortDocumentTitle })
}

function onPathChange() {
  if (
    isLocationSpacesActive(router, 'files-spaces-generic') &&
    !isLocationSpacesActive(router, 'files-spaces-projects')
  ) {
    // generic space has its own logic to set the document title
    return
  }

  const extracted = extractPageTitleFromRoute(unref(route))
  if (extracted) {
    announceRouteChange(extracted)
  }
}

onMounted(() => {
  eventBus.subscribe('runtime.router.path-chaged.after', onPathChange)
  eventBus.subscribe('runtime.documentTitle.changed', announceRouteChange)

  if (unref(layoutType) !== 'application') {
    const loader = document.getElementById('splash-loading')
    if (!loader?.classList.contains('splash-hide')) {
      loader.classList.add('splash-hide')
    }
  }
})
</script>
