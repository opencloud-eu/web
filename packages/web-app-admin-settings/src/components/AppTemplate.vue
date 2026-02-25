<template>
  <main class="flex app-content size-full rounded-l-xl">
    <div class="admin-settings-wrapper flex-1 flex size-full flex-nowrap sm:flex-wrap">
      <app-loading-spinner v-if="loading" />
      <template v-else>
        <div id="admin-settings-view-wrapper" class="flex-1 size-full flex-wrap overflow-y-auto">
          <div
            id="admin-settings-app-bar"
            ref="appBarRef"
            class="pb-2 px-4 top-0 z-20"
            :class="{ sticky: isSticky }"
          >
            <div class="flex justify-between items-center h-13">
              <oc-breadcrumb
                v-if="!isMobileWidth"
                id="admin-settings-breadcrumb"
                :items="breadcrumbs"
                :mobile-breakpoint="isSideBarOpen ? 'md' : 'sm'"
              />
              <mobile-nav />
              <div class="flex">
                <view-options
                  v-if="showViewOptions"
                  :has-hidden-files="false"
                  :has-file-extensions="false"
                  :has-pagination="true"
                  :pagination-options="paginationOptions"
                  :per-page-default="perPageDefault"
                  per-page-storage-prefix="admin-settings"
                />
              </div>
            </div>
            <div v-if="showAppBar" class="flex items-center mt-1 min-h-10">
              <slot
                name="topbarActions"
                :limited-screen-space="limitedScreenSpace"
                class="flex-1 flex flex-start"
              />
              <batch-actions
                v-if="showBatchActions"
                :actions="batchActions"
                :action-options="{ resources: batchActionItems }"
                :limited-screen-space="limitedScreenSpace"
              />
            </div>
          </div>
          <slot name="mainContent" />
        </div>
        <side-bar
          v-if="isSideBarOpen"
          :available-panels="sideBarAvailablePanels"
          :panel-context="sideBarPanelContext"
          :loading="sideBarLoading"
        >
          <template #header>
            <slot name="sideBarHeader" />
          </template>
        </side-bar>
      </template>
    </div>
  </main>
</template>

<script lang="ts">
import { perPageDefault, paginationOptions } from '../defaults'
import {
  AppLoadingSpinner,
  SideBar,
  BatchActions,
  SideBarPanelContext,
  Action,
  useIsTopBarSticky,
  useSideBar,
  MobileNav
} from '@opencloud-eu/web-pkg'
import {
  defineComponent,
  inject,
  onBeforeUnmount,
  PropType,
  Ref,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import { useAppDefaults } from '@opencloud-eu/web-pkg'
import { SideBarPanel } from '@opencloud-eu/web-pkg'
import { BreadcrumbItem } from '@opencloud-eu/design-system/helpers'
import { ViewOptions } from '@opencloud-eu/web-pkg'
import { Item } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'

export default defineComponent({
  components: {
    SideBar,
    AppLoadingSpinner,
    BatchActions,
    ViewOptions,
    MobileNav
  },
  props: {
    breadcrumbs: {
      required: true,
      type: Array as PropType<BreadcrumbItem[]>
    },
    sideBarAvailablePanels: {
      required: false,
      type: Array as PropType<SideBarPanel<unknown, unknown, unknown>[]>,
      default: (): SideBarPanel<unknown, unknown, unknown>[] => []
    },
    sideBarPanelContext: {
      required: false,
      type: Object as PropType<SideBarPanelContext<unknown, unknown, unknown>>,
      default: (): SideBarPanelContext<unknown, unknown, unknown> => ({})
    },
    loading: {
      required: false,
      type: Boolean,
      default: false
    },
    sideBarLoading: {
      required: false,
      type: Boolean,
      default: false
    },
    showViewOptions: {
      type: Boolean,
      required: false,
      default: false
    },
    showBatchActions: {
      type: Boolean,
      required: false,
      default: false
    },
    batchActionItems: {
      type: Array as PropType<Item[]>,
      required: false,
      default: (): Item[] => []
    },
    batchActions: {
      type: Array as PropType<Action[]>,
      required: false,
      default: (): Action[] => []
    },
    showAppBar: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  setup() {
    const sidebarStore = useSideBar()
    const { isSideBarOpen } = storeToRefs(sidebarStore)
    const appBarRef = useTemplateRef<HTMLElement>('appBarRef')
    const limitedScreenSpace = ref(false)
    const { isSticky } = useIsTopBarSticky()

    const onResize = () => {
      limitedScreenSpace.value = unref(isSideBarOpen)
        ? window.innerWidth <= 1600
        : window.innerWidth <= 1200
    }
    const resizeObserver = new ResizeObserver(onResize)

    watch(
      appBarRef,
      (ref) => {
        if (ref) {
          resizeObserver.observe(unref(appBarRef))
        }
      },
      { immediate: true }
    )

    onBeforeUnmount(() => {
      if (unref(appBarRef)) {
        resizeObserver.unobserve(unref(appBarRef))
      }
    })

    return {
      isMobileWidth: inject<Ref<boolean>>('isMobileWidth'),
      appBarRef,
      limitedScreenSpace,
      isSideBarOpen,
      ...useAppDefaults({
        applicationId: 'admin-settings'
      }),
      perPageDefault,
      paginationOptions,
      isSticky
    }
  }
})
</script>
