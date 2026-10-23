import { unref } from 'vue'
import { useMessages } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { CONTACTS_PAGE_SIZE } from '../../../src/composables/useLoadContacts'
import { useContactsStore } from '../../../src/composables/piniaStores/contacts'

type LoadContactsModule = typeof import('../../../src/composables/useLoadContacts')

const page = (ids: string[], next?: string) => ({
  data: { results: ids.map((id) => ({ id })) },
  headers: next ? { next } : {}
})

describe('useLoadContacts', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // the loading task is a module singleton bound to the client service of its first caller
    vi.resetModules()
  })

  it('loads all pages of an address book', async () => {
    const { mocks, instance } = await getWrapper()
    mocks.$clientService.httpAuthenticated.get
      .mockResolvedValueOnce(page(['1', '2'], 'token') as any)
      .mockResolvedValueOnce(page(['3']) as any)

    await instance.loadContacts('account', 'book')

    const get = mocks.$clientService.httpAuthenticated.get
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[0][1].params).toEqual({ limit: CONTACTS_PAGE_SIZE })
    expect(get.mock.calls[1][1].params).toEqual({ limit: CONTACTS_PAGE_SIZE, next: 'token' })
    expect(useContactsStore().setContacts).toHaveBeenCalledWith([
      { id: '1' },
      { id: '2' },
      { id: '3' }
    ])
    expect(unref(instance.error)).toBeUndefined()
  })

  it.each([
    { name: 'an empty page', last: { data: { limit: 2, total: 2 }, headers: { next: 'more' } } },
    { name: 'no page', last: { data: null, headers: { next: 'more' } } }
  ])('stops at $name although the API returns another next token', async ({ last }) => {
    const { mocks, instance } = await getWrapper()
    mocks.$clientService.httpAuthenticated.get
      .mockResolvedValueOnce(page(['1'], 'token') as any)
      .mockResolvedValueOnce(last as any)

    await instance.loadContacts('account', 'book')

    expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(2)
    expect(useContactsStore().setContacts).toHaveBeenCalledWith([{ id: '1' }])
  })

  it('stops when all contacts are loaded', async () => {
    const { mocks, instance } = await getWrapper()
    mocks.$clientService.httpAuthenticated.get.mockResolvedValueOnce({
      data: { results: [{ id: '1' }, { id: '2' }], total: 2 },
      headers: { next: 'more' }
    } as any)

    await instance.loadContacts('account', 'book')

    expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(1)
  })

  it('stops when the API repeats a next token', async () => {
    const { mocks, instance } = await getWrapper()
    mocks.$clientService.httpAuthenticated.get
      .mockResolvedValueOnce(page(['1'], 'token') as any)
      .mockResolvedValueOnce(page(['2'], 'token') as any)

    await instance.loadContacts('account', 'book')

    expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(2)
    expect(useContactsStore().setContacts).toHaveBeenCalledWith([{ id: '1' }, { id: '2' }])
  })

  it('stops at a page without new contacts', async () => {
    const { mocks, instance } = await getWrapper()
    mocks.$clientService.httpAuthenticated.get
      .mockResolvedValueOnce(page(['1', '2'], 'token-1') as any)
      .mockResolvedValueOnce(page(['1', '2'], 'token-2') as any)

    await instance.loadContacts('account', 'book')

    expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(2)
    expect(useContactsStore().setContacts).toHaveBeenCalledWith([{ id: '1' }, { id: '2' }])
  })

  it('keeps the loaded contacts if a later page fails', async () => {
    const { mocks, instance } = await getWrapper()
    mocks.$clientService.httpAuthenticated.get
      .mockResolvedValueOnce(page(['1'], 'token') as any)
      .mockRejectedValueOnce(new Error('failed'))

    await expect(instance.loadContacts('account', 'book')).resolves.toEqual([{ id: '1' }])

    expect(useContactsStore().setContacts).toHaveBeenCalledWith([{ id: '1' }])
    expect(unref(instance.error)).toBeUndefined()
    expect(useMessages().showMessage).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'warning' })
    )
  })

  it('sets the error state and clears the contacts if loading fails', async () => {
    const { mocks, instance } = await getWrapper()
    const error = new Error('failed')
    mocks.$clientService.httpAuthenticated.get.mockRejectedValue(error)

    await expect(instance.loadContacts('account', 'book')).rejects.toThrow()

    expect(unref(instance.error)).toBe(error)
    expect(useContactsStore().setContacts).toHaveBeenCalledWith([])
  })

  it('reloads the last address book', async () => {
    const { mocks, instance } = await getWrapper()
    mocks.$clientService.httpAuthenticated.get.mockResolvedValue(page(['1']) as any)

    await instance.loadContacts('account', 'book-2')
    await instance.reloadContacts()

    const urls = mocks.$clientService.httpAuthenticated.get.mock.calls.map(([url]) => url)
    expect(urls).toHaveLength(2)
    expect(urls[1]).toMatch(/accounts\/account\/addressbooks\/book-2\/contacts$/)
  })
})

async function getWrapper() {
  const { useLoadContacts }: LoadContactsModule =
    await import('../../../src/composables/useLoadContacts')
  const mocks = defaultComponentMocks()
  let instance: ReturnType<typeof useLoadContacts>
  getComposableWrapper(
    () => {
      instance = useLoadContacts()
    },
    { mocks, provide: mocks }
  )
  return { mocks, instance }
}
