import { SDKSearch } from '../../../src/search'
import { searchLimit } from '../../../src/search/sdk/list'
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
    const search = new SDKSearch(getStore(), vi.fn(), mock<ConfigStore>())
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

        const search = new SDKSearch(getStore(['search-files']), vi.fn(), configStore)

        expect(search.previewSearch.available).toBe(v.available)
      })
    })
  })

  describe('SDKProvider listSearch', () => {
    it('requests hidden results so that the resources store can filter them reactively', async () => {
      const searchFunction = vi.fn()
      const search = new SDKSearch(getStore(['search-files']), searchFunction, mock<ConfigStore>())

      await search.listSearch.search('foo')

      expect(searchFunction).toHaveBeenCalledWith('foo', searchLimit, { includeHidden: true })
    })
  })
})
