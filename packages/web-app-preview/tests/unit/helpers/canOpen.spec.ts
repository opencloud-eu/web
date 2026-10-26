import { Resource } from '@opencloud-eu/web-client'
import { canOpen } from '../../../src/helpers/canOpen'

const resource = (mimeType: string, extra: Partial<Resource> = {}) =>
  ({
    mimeType,
    isInVault: false,
    hasPreview: () => false,
    ...extra
  }) as unknown as Resource

describe('canOpen', () => {
  it('rejects types the viewer does not handle', () => {
    expect(canOpen(resource('application/pdf', { hasPreview: () => true }))).toBe(false)
    expect(canOpen(resource(undefined))).toBe(false)
  })

  it('takes audio, video and svg, they are shown from the original', () => {
    expect(canOpen(resource('audio/mpeg'))).toBe(true)
    expect(canOpen(resource('video/mp4'))).toBe(true)
    expect(canOpen(resource('image/svg+xml'))).toBe(true)
  })

  it('takes other images only with a preview the server renders', () => {
    expect(canOpen(resource('image/jpeg'))).toBe(false)
    expect(canOpen(resource('image/jpeg', { hasPreview: () => true }))).toBe(true)
    expect(canOpen(resource('image/heic', { hasPreview: () => true }))).toBe(true)
    expect(canOpen(resource('image/heic'))).toBe(false)
  })

  it('takes vault images regardless of the browser', () => {
    expect(canOpen(resource('image/jpeg', { isInVault: true }))).toBe(true)
    expect(canOpen(resource('image/heic', { isInVault: true }))).toBe(true)
  })
})
