import { parsePathQuery } from '../../../src/router/helpers'

describe('parsePathQuery', () => {
  it('returns the path only if there is no query', () => {
    expect(parsePathQuery('/files/spaces/personal')).toEqual({ path: '/files/spaces/personal' })
  })

  it('splits a flat query', () => {
    expect(parsePathQuery('/s/token?fileId=1&shareId=2')).toEqual({
      path: '/s/token',
      query: { fileId: '1', shareId: '2' }
    })
  })

  it('parses dotted keys into nested objects', () => {
    expect(
      parsePathQuery(
        '/preview?contextRouteName=files-guest-link&contextRouteParams.driveAliasAndItem=share%2FFolder'
      )
    ).toEqual({
      path: '/preview',
      query: {
        contextRouteName: 'files-guest-link',
        contextRouteParams: { driveAliasAndItem: 'share/Folder' }
      }
    })
  })
})
