import { SDKSearch } from '../../../src/search'
import { Router } from 'vue-router'
import { mock } from 'vitest-mock-extended'
import { createTestingPinia, writable } from '@opencloud-eu/web-test-helpers'
import { ConfigStore, useCapabilityStore } from '@opencloud-eu/web-pkg'

const getStore = (reports: string[] = []) => {
  createTestingPinia({
    initialState: { capabilities: { capabilities: { dav: { reports } } } }
  })
  return useCapabilityStore()
}

describe('SDKProvider', () => {
  it('is only available if announced via capabilities', () => {
    const search = new SDKSearch(getStore(), mock<Router>(), vi.fn(), mock<ConfigStore>())
    expect(search.available).toBe(false)
  })

  describe('SDKProvider previewSearch', () => {
    it('is only available if not embedded', () => {
      ;[
        { options: { embed: { enabled: true } }, available: false },
        { options: { embed: { enabled: false } }, available: true },
        { options: { embed: undefined }, available: true },
        { options: {}, available: true },
        { options: undefined, available: true }
      ].forEach((v) => {
        const configStore = mock<ConfigStore>()
        writable(configStore).options = v.options as any

        const search = new SDKSearch(
          getStore(['search-files']),
          mock<Router>(),
          vi.fn(),
          configStore
        )

        expect(search.previewSearch.available).toBe(v.available)
      })
    })
  })
})
