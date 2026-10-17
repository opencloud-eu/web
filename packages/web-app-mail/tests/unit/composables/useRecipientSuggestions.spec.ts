import { unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  clearRecipientsCache,
  filterRecipientSuggestions,
  getRecipientSuggestions,
  useRecipientSuggestions
} from '../../../src/composables/useRecipientSuggestions'

const contacts = [
  {
    id: '1',
    name: { full: 'Ada Lovelace' },
    emails: { a: { address: 'ada@example.org' }, b: { address: 'countess@analytical.example' } }
  },
  {
    id: '2',
    name: { full: 'Grace Hopper' },
    emails: { a: { address: 'grace.hopper@navy.example' } }
  }
]

describe('getRecipientSuggestions', () => {
  it('creates one suggestion per email address without duplicates', () => {
    expect(
      getRecipientSuggestions([
        ...contacts,
        {
          id: '3',
          name: { components: [{ kind: 'given', value: 'Ada' }] },
          emails: { a: { address: 'ADA@example.org' } }
        },
        { id: '4', emails: { a: { address: 'alan@example.org' } } }
      ])
    ).toEqual([
      { name: 'Ada Lovelace', email: 'ada@example.org' },
      { name: 'Ada Lovelace', email: 'countess@analytical.example' },
      { name: 'Grace Hopper', email: 'grace.hopper@navy.example' },
      { name: '', email: 'alan@example.org' }
    ])
  })
})

describe('filterRecipientSuggestions', () => {
  const recipients = getRecipientSuggestions(contacts)

  it.each([
    ['ad', ['ada@example.org', 'countess@analytical.example']],
    ['love', ['ada@example.org', 'countess@analytical.example']],
    ['hop', ['grace.hopper@navy.example']],
    ['navy', ['grace.hopper@navy.example']],
    ['grace.h', ['grace.hopper@navy.example']],
    ['xyz', []]
  ])('matches the beginning of names and addresses: %s', (term, emails) => {
    expect(filterRecipientSuggestions(recipients, term).map(({ email }) => email)).toEqual(emails)
  })
})

describe('useRecipientSuggestions', () => {
  beforeEach(() => {
    clearRecipientsCache()
  })

  it('loads the contacts of the account once and filters them locally', async () => {
    const { instance, mocks } = getWrapper()
    mocks.$clientService.httpAuthenticated.get.mockResolvedValue({
      data: { results: contacts }
    } as any)

    instance.searchSuggestions('account', 'ad')
    await vi.waitFor(() => expect(unref(instance.suggestions)).toHaveLength(2))
    instance.searchSuggestions('account', 'gra')
    await vi.waitFor(() =>
      expect(unref(instance.suggestions)).toEqual([
        { name: 'Grace Hopper', email: 'grace.hopper@navy.example' }
      ])
    )

    const get = mocks.$clientService.httpAuthenticated.get
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][0]).toMatch(/\/groupware\/accounts\/account\/contacts$/)
  })

  it('does not search for short terms', () => {
    const { instance, mocks } = getWrapper()

    instance.searchSuggestions('account', 'a')

    expect(mocks.$clientService.httpAuthenticated.get).not.toHaveBeenCalled()
    expect(unref(instance.suggestions)).toEqual([])
  })

  it('shows no suggestions if the contacts cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { instance, mocks } = getWrapper()
    mocks.$clientService.httpAuthenticated.get.mockRejectedValue(new Error())

    instance.searchSuggestions('account', 'ad')

    await vi.waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(unref(instance.suggestions)).toEqual([])
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks()
  let instance: ReturnType<typeof useRecipientSuggestions>
  getComposableWrapper(
    () => {
      instance = useRecipientSuggestions()
    },
    { mocks, provide: mocks }
  )
  return { instance, mocks }
}
