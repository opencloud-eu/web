<template>
  <div id="web" class="bg-role-chrome h-dvh max-h-dvh overflow-y-hidden">
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
import { findOpenGraphImage, injectOpenGraphMeta, OpenGraphMetaOptions } from './helpers/meta'
import { onMounted, ref, unref } from 'vue'
import { additionalTranslations } from './helpers/additionalTranslations' // eslint-disable-line
import {
  eventBus,
  buildUrl,
  isLocationSpacesActive,
  useAuthStore,
  useRouter,
  useSideBar,
  useThemeStore
} from '@opencloud-eu/web-pkg'
import { RouteLocation, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const { $gettext } = useGettext()
const { currentTheme } = storeToRefs(themeStore)

const router = useRouter()
const route = useRoute()
const { layout, layoutType } = useLayout({ router })

const { onInitialLoad } = useSideBar()
onInitialLoad()

const announcement = ref<string>()
const currentPageTitle = ref<string>()

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

function getCanonicalUrl() {
  if (authStore.publicLinkContextReady && authStore.publicLinkToken) {
    const publicLinkPrefix = authStore.publicLinkType === 'ocm' ? 'o' : 's'
    return buildUrl(router, `/${publicLinkPrefix}/${encodeURIComponent(authStore.publicLinkToken)}`)
  }

  return buildUrl(router, unref(route).path)
}

type OpenGraphMedia = Partial<
  Pick<
    OpenGraphMetaOptions,
    'title' | 'image' | 'imageAlt' | 'video' | 'videoType' | 'audio' | 'audioType'
  >
>

const currentOpenGraphMedia = ref<OpenGraphMedia>({})

function updateOpenGraphMeta(media?: OpenGraphMedia) {
  if (media) {
    currentOpenGraphMedia.value = media
  }

  if (!unref(currentPageTitle)) {
    return
  }

  const openGraphMedia = authStore.publicLinkContextReady ? unref(currentOpenGraphMedia) : {}
  const theme = unref(currentTheme)
  injectOpenGraphMeta({
    title: openGraphMedia.title || unref(currentPageTitle),
    siteName: theme.name,
    url: getCanonicalUrl(),
    description: theme.slogan,
    image: openGraphMedia.image || findOpenGraphImage([theme.logo, theme.favicon]),
    imageAlt: openGraphMedia.imageAlt || openGraphMedia.title || theme.name,
    video: openGraphMedia.video,
    videoType: openGraphMedia.videoType,
    audio: openGraphMedia.audio,
    audioType: openGraphMedia.audioType
  })
}

function announceRouteChange({
  shortDocumentTitle,
  fullDocumentTitle
}: {
  shortDocumentTitle: string
  fullDocumentTitle: string
}) {
  document.title = fullDocumentTitle
  currentPageTitle.value = shortDocumentTitle
  updateOpenGraphMeta()
  announcement.value = $gettext('Navigated to %{ pageTitle }', { pageTitle: shortDocumentTitle })
}

function onPathChange() {
  currentOpenGraphMedia.value = {}

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
  eventBus.subscribe<OpenGraphMedia>('runtime.openGraphMeta.changed', updateOpenGraphMeta)

  if (unref(layoutType) !== 'application') {
    const loader = document.getElementById('splash-loading')
    if (!loader?.classList.contains('splash-hide')) {
      loader.classList.add('splash-hide')
    }
  }
})
</script>
