import { defineStore } from 'pinia'
import { computed, nextTick, ref, unref } from 'vue'
import { eventBus } from '../../services/eventBus'
import { useLocalStorage } from '../localStorage'
import { useEmbedMode } from '../embedMode'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

/** @deprecated use exposed methods from useSideBar instead */
export enum SideBarEventTopics {
  open = 'sidebar.open',
  close = 'sidebar.close',
  toggle = 'sidebar.toggle',
  openWithPanel = 'sidebar.openWithPanel',
  setActivePanel = 'sidebar.setActivePanel'
}

export const useSideBar = defineStore('sideBar', () => {
  const { isEnabled: isEmbedModeEnabled } = useEmbedMode()
  const isSideBarOpenLocalStorage = useLocalStorage(`oc_sideBarOpen`, false)
  const { isMobile } = useIsMobile()

  const isSideBarOpenIsolated = ref(false)
  const sideBarActivePanel = ref<string | null>(null)

  const isSideBarOpen = computed({
    get() {
      if (unref(isEmbedModeEnabled)) {
        return unref(isSideBarOpenIsolated)
      }

      return unref(isSideBarOpenLocalStorage)
    },

    set(value) {
      if (unref(isEmbedModeEnabled)) {
        isSideBarOpenIsolated.value = value
        return
      }

      isSideBarOpenLocalStorage.value = value
    }
  })

  const focusSidebar = async () => {
    await nextTick()
    const appSideBar = document.getElementById('app-sidebar')
    if (!appSideBar) {
      return
    }
    appSideBar.focus()
  }

  const toggleSideBar = () => {
    isSideBarOpen.value = !unref(isSideBarOpen)
    if (unref(isSideBarOpen)) {
      focusSidebar()
    }
  }
  const closeSideBar = () => {
    isSideBarOpen.value = false
    sideBarActivePanel.value = null
  }
  const openSideBar = () => {
    isSideBarOpen.value = true
    sideBarActivePanel.value = null
    focusSidebar()
  }
  const openSideBarPanel = (panelName: string) => {
    isSideBarOpen.value = true
    sideBarActivePanel.value = panelName
    focusSidebar()
  }
  const setActiveSideBarPanel = (panelName: string) => {
    sideBarActivePanel.value = panelName
  }

  eventBus.subscribe(SideBarEventTopics.toggle, toggleSideBar)
  eventBus.subscribe(SideBarEventTopics.close, closeSideBar)
  eventBus.subscribe(SideBarEventTopics.open, openSideBar)
  eventBus.subscribe(SideBarEventTopics.openWithPanel, openSideBarPanel)
  eventBus.subscribe(SideBarEventTopics.setActivePanel, setActiveSideBarPanel)

  const onInitialLoad = () => {
    if (unref(isMobile)) {
      // close sidebar on mobile devices on initial load because it's a bottom drawer
      isSideBarOpen.value = false
    }
  }

  const onPanelActive = (name: string, callback: (string: string) => void) => {
    eventBus.subscribe(SideBarEventTopics.setActivePanel, (panelName: string) => {
      if (name !== panelName) {
        return
      }
      // acount for threshold
      setTimeout(() => {
        callback(panelName)
      }, 100)
    })
  }

  return {
    isSideBarOpen,
    sideBarActivePanel,
    focusSidebar,
    onInitialLoad,
    toggleSideBar,
    closeSideBar,
    openSideBar,
    openSideBarPanel,
    setActiveSideBarPanel,

    /** @deprecated */
    onPanelActive
  }
})

export type SideBarStore = ReturnType<typeof useSideBar>
