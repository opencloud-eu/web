import { mock } from 'vitest-mock-extended'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { AppProviderService, ClassicApplicationScript, MimeType } from '@opencloud-eu/web-pkg'
import externalApp from '../../src/index'

vi.mock('virtual:l10n/web-app-external', () => ({ default: {} }))

describe('external app', () => {
  it('declares the icon url of the app provider as image icon', () => {
    const { extensions } = getAppInfo('https://example.org/collabora.png')
    expect(extensions[0].icon).toEqual({ src: 'https://example.org/collabora.png' })
  })
  it('declares no icon when the app provider has none', () => {
    const { extensions } = getAppInfo('')
    expect(extensions[0].icon).toBeUndefined()
  })
  it('adds quick create with a translated description for known creatable types', () => {
    const { extensions } = getAppInfo('', { allow_creation: true })
    expect(extensions[0].newFileMenu.quickCreate).toBe(true)
    expect(extensions[0].newFileMenu.description()).toBe('OpenDocument text')
  })
  it('adds no description for unknown creatable types', () => {
    const { extensions } = getAppInfo('', {
      allow_creation: true,
      mime_type: 'application/x-unknown',
      description: 'Unknown document'
    })
    expect(extensions[0].newFileMenu.quickCreate).toBe(true)
    expect(extensions[0].newFileMenu.description).toBeUndefined()
  })
})

function getAppInfo(icon: string, mimeTypeOverrides: Partial<MimeType> = {}) {
  const appProviderService = mock<AppProviderService>()
  appProviderService.getMimeTypesByAppName.mockReturnValue([
    {
      ext: 'odt',
      mime_type: 'application/vnd.oasis.opendocument.text',
      app_providers: [{ name: 'Collabora', icon, secure_view: false }],
      ...mimeTypeOverrides
    }
  ])

  let script: ClassicApplicationScript
  getComposableWrapper(
    () => {
      script = externalApp.setup({ appName: 'Collabora', applicationConfig: {} })
    },
    { provide: { $appProviderService: appProviderService } }
  )
  return script.appInfo
}
