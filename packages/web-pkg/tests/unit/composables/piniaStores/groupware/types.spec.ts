import { AccountSchema } from '../../../../../src/composables/piniaStores/groupware/types'

describe('groupware account schema', () => {
  it('normalizes accounts without identities returned by the Groupware API', () => {
    const account = AccountSchema.parse({
      accountId: 'account-1',
      name: 'Personal',
      isPersonal: true,
      isReadOnly: false
    })

    expect(account.identities).toEqual([])
  })
})
