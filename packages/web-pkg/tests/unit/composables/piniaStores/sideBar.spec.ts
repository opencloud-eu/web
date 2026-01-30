import { useSideBar } from '../../../../src/composables/piniaStores'
import { ref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import * as localStorage from '../../../../src/composables/localStorage'
import { createPinia, setActivePinia } from 'pinia'
import { useEmbedMode } from '../../../../src/composables/embedMode'
import { mock } from 'vitest-mock-extended'

vi.mock('../../../../src/composables/embedMode')

const localStorageSpy = vi
  .spyOn(localStorage, 'useLocalStorage')
  .mockImplementation(() => ref(false))

describe('useSideBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should have "isSideBarOpen" as "false"', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.isSideBarOpen).toBeFalsy()
        }
      })
    })
    it('should have "sideBarActivePanel" as "null"', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.sideBarActivePanel).toBeNull()
        }
      })
    })
  })
  describe('open', () => {
    it('should set "isSideBarOpen" to "true"', () => {
      getWrapper({
        setup: (instance) => {
          instance.openSideBar()
          expect(instance.isSideBarOpen).toBeTruthy()
        }
      })
    })
    it('should set "sideBarActivePanel" to "null"', () => {
      getWrapper({
        setup: (instance) => {
          instance.openSideBar()
          expect(instance.sideBarActivePanel).toBeNull()
        }
      })
    })
  })
  describe('close', () => {
    it('should set "isSideBarOpen" to "false"', () => {
      getWrapper({
        setup: (instance) => {
          instance.closeSideBar()
          expect(instance.isSideBarOpen).toBeFalsy()
        }
      })
    })
    it('should set "sideBarActivePanel" to "null"', () => {
      getWrapper({
        setup: (instance) => {
          instance.closeSideBar()
          expect(instance.sideBarActivePanel).toBeNull()
        }
      })
    })
  })
  describe('toggle', () => {
    it('should toggle "isSideBarOpen" back and forth', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.isSideBarOpen).toBeFalsy()
          instance.toggleSideBar()
          expect(instance.isSideBarOpen).toBeTruthy()
          instance.toggleSideBar()
          expect(instance.isSideBarOpen).toBeFalsy()
        }
      })
    })
    it('should not influence "sideBarActivePanel"', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.sideBarActivePanel).toBeNull()
          instance.setActiveSideBarPanel('SomePanel')
          expect(instance.sideBarActivePanel).toBe('SomePanel')
          instance.toggleSideBar()
          expect(instance.sideBarActivePanel).toBe('SomePanel')
        }
      })
    })
  })
  describe('openSideBarPanel', () => {
    it('should set "isSideBarOpen" to "true"', () => {
      getWrapper({
        setup: (instance) => {
          instance.openSideBarPanel('SomePanel')
          expect(instance.isSideBarOpen).toBeTruthy()
        }
      })
    })
    it('should set "sideBarActivePanel" to provided value', () => {
      getWrapper({
        setup: (instance) => {
          instance.openSideBarPanel('SomePanel')
          expect(instance.sideBarActivePanel).toBe('SomePanel')
        }
      })
    })
  })

  describe('embedMode', () => {
    beforeEach(() => {
      localStorageSpy.mockImplementationOnce(() => ref(true))
    })

    it('should use local ref when embed mode is enabled', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.isSideBarOpen).toBeFalsy()
        },
        embedEnabled: true
      })
    })

    it('should use local storage when embed mode is disabled', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.isSideBarOpen).toBeTruthy()
        },
        embedEnabled: false
      })
    })
  })
})

function getWrapper({
  setup,
  embedEnabled = false
}: {
  setup: (instance: ReturnType<typeof useSideBar>) => void
  embedEnabled?: boolean
}) {
  vi.mocked(useEmbedMode).mockReturnValue(
    mock<ReturnType<typeof useEmbedMode>>({ isEnabled: ref(embedEnabled) })
  )

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSideBar()
        setup(instance)
      },
      { pluginOptions: { pinia: false } }
    )
  }
}
