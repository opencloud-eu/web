import { mock } from 'vitest-mock-extended'
import { isOfficialApp } from '../../../src/helpers'
import { App, AppAuthor } from '../../../src/types'

function getApp(authors: AppAuthor[]) {
  return { ...mock<App>(), authors }
}

describe('isOfficialApp', () => {
  it.each(['OpenCloud GmbH', 'opencloud-eu', 'The OPENCLOUD Team'])(
    'returns true if an author name contains "opencloud" (%s)',
    (name) => {
      expect(isOfficialApp(getApp([{ name: 'John Doe' }, { name }]))).toBe(true)
    }
  )
  it('returns false if no author name contains "opencloud"', () => {
    expect(isOfficialApp(getApp([{ name: 'John Doe' }, { name: 'Open Cloud Fans' }]))).toBe(false)
  })
  it('returns false if the app has no authors', () => {
    expect(isOfficialApp(getApp([]))).toBe(false)
  })
})
