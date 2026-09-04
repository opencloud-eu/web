import { DeniedReason, isRefusal, refuse } from '../../../src/lib/errors.ts'

describe('refuse', () => {
  it('prefixes the message with the reason and attaches it to the error', () => {
    const error = refuse(DeniedReason.AccessDenied, 'no permission')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('access-denied: no permission')
    expect((error as Error & { reason: string }).reason).toBe(DeniedReason.AccessDenied)
  })
})

describe('isRefusal', () => {
  it('accepts an error created by refuse', () => {
    expect(isRefusal(refuse(DeniedReason.ServerError, 'boom'))).toBe(true)
  })

  it.each([
    ['a plain error', new Error('boom')],
    ['an error with a non-string reason', Object.assign(new Error('boom'), { reason: 1 })],
    ['a plain object carrying a reason', { reason: 'token-invalid' }],
    ['a string', 'token-invalid'],
    ['undefined', undefined]
  ])('rejects %s', (_name, value) => {
    expect(isRefusal(value)).toBe(false)
  })
})
