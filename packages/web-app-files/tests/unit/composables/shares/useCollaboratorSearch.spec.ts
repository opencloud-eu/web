import { unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useCollaboratorAutocomplete } from '../../../../src/composables/shares/useCollaboratorSearch'

describe('useCollaboratorAutocomplete', () => {
  it('stops the search progress when the search fails', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchResults = vi.fn().mockRejectedValue(new Error('403'))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete(fetchResults)
    })

    autocomplete.onSearch('mary')
    expect(unref(autocomplete.searchInProgress)).toBe(true)
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).toHaveBeenCalledWith('mary', expect.anything())
    expect(unref(autocomplete.searchInProgress)).toBe(false)
  })
})
