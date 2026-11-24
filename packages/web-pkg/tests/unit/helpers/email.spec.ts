import { isValidEmail } from '../../../src/helpers/email'

describe('isValidEmail', () => {
  it.each([
    'jan@opencloud.eu',
    'jan.doe@sub.opencloud.eu',
    'jan+tag@opencloud.eu',
    "o'brien@opencloud.eu",
    'jan!#$%&*/=?^{|}~@opencloud.eu',
    'jan@open-cloud.eu',
    'jan@opencloud.c0m',
    `${'a'.repeat(64)}@opencloud.eu`,
    `jan@${'a'.repeat(63)}.eu`
  ])('accepts "%s"', (email) => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each([
    '',
    undefined,
    'jan',
    'jan@',
    '@opencloud.eu',
    'jan@opencloud',
    'jan@@opencloud.eu',
    'jan doe@opencloud.eu',
    '.jan@opencloud.eu',
    'jan.@opencloud.eu',
    'jan..doe@opencloud.eu',
    'jan@-opencloud.eu',
    'jan@opencloud.e',
    'jan@opencloud.1eu',
    'jan@opencloud.xn--p1ai',
    'jän@opencloud.eu',
    'jan@müller.de',
    `${'a'.repeat(65)}@opencloud.eu`,
    `jan@${'a'.repeat(64)}.eu`,
    `jan@${'a.'.repeat(125)}eu`
  ])('rejects "%s"', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })
})
