import { createHttpError } from '../../../src/helpers/httpError'

describe('createHttpError', () => {
  it('sets the x-request-id header when an id is given', () => {
    const error = createHttpError({ message: 'error', statusCode: 500, xReqId: 'request-id' })
    expect(error.response.headers.get('x-request-id')).toBe('request-id')
  })

  it('does not set the x-request-id header without an id', () => {
    const error = createHttpError({
      message: 'Failed to fetch',
      statusCode: undefined,
      xReqId: undefined
    })
    expect(error.response.headers.get('x-request-id')).toBeNull()
  })
})
