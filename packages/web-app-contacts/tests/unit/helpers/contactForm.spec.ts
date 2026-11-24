import { isContactEmailInvalid } from '../../../src/helpers/contactForm'

describe('isContactEmailInvalid', () => {
  it.each(['', '   ', 'jan@opencloud.eu', '  jan.doe+tag@opencloud.eu  '])(
    'accepts "%s"',
    (email) => {
      expect(isContactEmailInvalid(email)).toBe(false)
    }
  )

  it.each(['jan', 'jan@', 'jan@opencloud', 'jan doe@opencloud.eu', 'jan@@opencloud.eu'])(
    'rejects "%s"',
    (email) => {
      expect(isContactEmailInvalid(email)).toBe(true)
    }
  )
})
