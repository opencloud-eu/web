import { unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useSpacesLoading } from '../../../../src/composables/driveResolver'
import { useSpacesStore } from '../../../../src/composables/piniaStores'

describe('useSpacesLoading', () => {
  it('is loading until the store is initialized and no longer fetching', () => {
    getComposableWrapper(() => {
      const spacesStore = useSpacesStore()
      const { areSpacesLoading } = useSpacesLoading()

      expect(unref(areSpacesLoading)).toBe(true)

      spacesStore.spacesInitialized = true
      expect(unref(areSpacesLoading)).toBe(false)

      spacesStore.spacesLoading = true
      expect(unref(areSpacesLoading)).toBe(true)
    })
  })

  it('resolves waitForSpaces once the spaces are there', async () => {
    let resolved = false
    let spacesStore: ReturnType<typeof useSpacesStore>

    getComposableWrapper(() => {
      spacesStore = useSpacesStore()
      const { waitForSpaces } = useSpacesLoading()
      waitForSpaces().then(() => (resolved = true))
    })

    await Promise.resolve()
    expect(resolved).toBe(false)

    spacesStore.spacesInitialized = true
    await new Promise((resolve) => setTimeout(resolve))
    expect(resolved).toBe(true)
  })

  it('resolves waitForSpaces right away when the spaces are already there', async () => {
    let resolved = false

    getComposableWrapper(() => {
      useSpacesStore().spacesInitialized = true
      const { waitForSpaces } = useSpacesLoading()
      waitForSpaces().then(() => (resolved = true))
    })

    await new Promise((resolve) => setTimeout(resolve))
    expect(resolved).toBe(true)
  })
})
