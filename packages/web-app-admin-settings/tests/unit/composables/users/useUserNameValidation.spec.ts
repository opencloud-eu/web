import { useUserNameValidation } from '../../../../src/composables/users'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useUserNameValidation', () => {
  describe('method "getUserNameError"', () => {
    it.each([
      { userName: ' ', error: 'User name cannot be empty' },
      { userName: 'jan openCloud', error: 'User name cannot contain white spaces' },
      { userName: 'n'.repeat(256), error: 'User name cannot exceed 255 characters' },
      { userName: '1moretry', error: 'User name cannot start with a number' },
      { userName: 'jan(', error: 'User name cannot contain special characters' },
      { userName: 'jana', error: '' },
      { userName: 'jan.doe_1', error: '' },
      { userName: 'sk@domain.tld', error: '' }
    ])('returns "$error" for "$userName"', ({ userName, error }) => {
      getComposableWrapper(() => {
        const { getUserNameError } = useUserNameValidation()
        expect(getUserNameError(userName)).toBe(error)
      })
    })
  })
})
