import {
  Log,
  WebStorageStateStore,
  UserManager as OidcUserManager,
  UserManagerSettings
} from 'oidc-client-ts'
import { buildUrl, useAppsStore } from '@opencloud-eu/web-pkg'
import { getAbilities } from './abilities'
import { AuthStore, UserStore, CapabilityStore, ConfigStore } from '@opencloud-eu/web-pkg'
import { ClientService } from '@opencloud-eu/web-pkg'
import { Ability, urlJoin } from '@opencloud-eu/web-client'
import { Language } from 'vue3-gettext'
import { loadAppTranslations, setCurrentLanguage } from '../../helpers/language'
import { SSEAdapter } from '@opencloud-eu/web-client/sse'
import { User as OcUser } from '@opencloud-eu/web-client/graph/generated'
import { SettingsBundle } from '../../helpers/settings'
import { WebWorkersStore } from '@opencloud-eu/web-pkg'
import { Router } from 'vue-router'

const postLoginRedirectUrlKey = 'oc.postLoginRedirectUrl'
type UnloadReason = 'authError' | 'logout'

export interface UserManagerOptions {
  clientService: ClientService
  configStore: ConfigStore
  ability: Ability
  language: Language
  userStore: UserStore
  authStore: AuthStore
  router: Router
  capabilityStore: CapabilityStore
  webWorkersStore: WebWorkersStore

  // number of seconds before an access token is to expire to raise the accessTokenExpiring event
  accessTokenExpiryThreshold: number
}

export class UserManager extends OidcUserManager {
  private clientService: ClientService
  private userStore: UserStore
  private authStore: AuthStore
  private webWorkersStore: WebWorkersStore
  private capabilityStore: CapabilityStore
  private updateAccessTokenPromise: Promise<void> | null
  private _unloadReason: UnloadReason
  private ability: Ability
  private language: Language
  private browserStorage: Storage
  public areEventHandlersRegistered: boolean

  constructor(options: UserManagerOptions) {
    const browserStorage = options.configStore.options.tokenStorageLocal
      ? localStorage
      : sessionStorage
    const storePrefix = 'oc_oAuth.'
    const userStore = new WebStorageStateStore({
      prefix: storePrefix,
      store: browserStorage
    })
    const openIdConfig: UserManagerSettings = {
      userStore,
      redirect_uri: buildUrl(options.router, '/oidc-callback.html'),
      silent_redirect_uri: buildUrl(options.router, '/oidc-silent-redirect.html'),

      response_mode: 'query',
      response_type: 'code', // "code" triggers auth code grant flow

      post_logout_redirect_uri: buildUrl(options.router, '/'),
      accessTokenExpiringNotificationTimeInSeconds: options.accessTokenExpiryThreshold,
      metadataUrl: urlJoin(
        options.authStore.webfingerDiscoveryData.authority,
        '.well-known/openid-configuration'
      ),

      // we trigger the token renewal manually via a timer running in a web worker
      automaticSilentRenew: false,
      loadUserInfo: false,

      // pass through options from the web config
      ...options.configStore.openIdConnect,
      // authority, client_id and scope come from the webfinger discovery process, overwriting the web config
      ...options.authStore.webfingerDiscoveryData
    }

    Log.setLogger(console)
    Log.setLevel(Log.WARN)

    super(openIdConfig)
    this.browserStorage = browserStorage
    this.clientService = options.clientService
    this.ability = options.ability
    this.language = options.language
    this.userStore = options.userStore
    this.authStore = options.authStore
    this.capabilityStore = options.capabilityStore
    this.webWorkersStore = options.webWorkersStore
  }

  /**
   * Looks up the access token of an already loaded user without enforcing a signin if no user exists.
   *
   * @return (string|null)
   */
  async getAccessToken(): Promise<string | null> {
    const user = await this.getUser()
    return user?.access_token
  }

  async getSessionId(): Promise<string | null> {
    const user = await this.getUser()
    return user?.profile?.sid
  }

  async removeUser(unloadReason: UnloadReason = 'logout') {
    this._unloadReason = unloadReason
    await super.removeUser()
  }

  get unloadReason(): UnloadReason {
    return this._unloadReason
  }

  getAndClearPostLoginRedirectUrl(): string {
    const url = this.browserStorage.getItem(postLoginRedirectUrlKey) || '/'
    this.browserStorage.removeItem(postLoginRedirectUrlKey)
    return url
  }

  setPostLoginRedirectUrl(url?: string): void {
    if (url) {
      this.browserStorage.setItem(postLoginRedirectUrlKey, url)
    } else {
      this.browserStorage.removeItem(postLoginRedirectUrlKey)
    }
  }

  updateContext(accessToken: string, sessionId: string, fetchUserData: boolean) {
    const userKnown = !!this.userStore.user
    const accessTokenChanged = this.authStore.accessToken !== accessToken
    if (!accessTokenChanged) {
      return this.updateAccessTokenPromise
    }

    this.authStore.setAccessToken(accessToken)
    this.authStore.setSessionId(sessionId)

    this.updateAccessTokenPromise = (async () => {
      if (!fetchUserData) {
        this.authStore.setIdpContextReady(true)
        return
      }

      if (this.capabilityStore.supportSSE && userKnown) {
        ;(this.clientService.sseAuthenticated as SSEAdapter).updateAccessToken(accessToken)
      }

      this.webWorkersStore.updateAccessTokens(accessToken)

      if (!userKnown) {
        await this.fetchUserInfo()
        this.authStore.setUserContextReady(true)
      }
    })()
    return this.updateAccessTokenPromise
  }

  private async fetchUserInfo() {
    const graphClient = this.clientService.graphAuthenticated
    // the first authenticated request needs to happen synchronously because it might
    // provision a new user via its middleware, which must not run asynchronously
    const graphUser = await graphClient.users.getMe()

    const roles = await this.fetchRoles()
    const [role, permissions] = await Promise.all([
      this.fetchRole({ graphUser, roles }),
      this.fetchPermissions({ user: graphUser })
    ])

    this.userStore.setUser({
      id: graphUser.id,
      onPremisesSamAccountName: graphUser.onPremisesSamAccountName,
      displayName: graphUser.displayName,
      mail: graphUser.mail,
      memberOf: graphUser.memberOf,
      appRoleAssignments: role ? [role as any] : [], // FIXME
      preferredLanguage: graphUser.preferredLanguage || ''
    })

    this.updateUserAbilities(permissions)

    if (graphUser.preferredLanguage) {
      const appsStore = useAppsStore()

      loadAppTranslations({
        apps: appsStore.apps,
        gettext: this.language,
        lang: graphUser.preferredLanguage
      })

      setCurrentLanguage({
        language: this.language,
        languageSetting: graphUser.preferredLanguage
      })
    }
  }

  private async fetchRoles() {
    const httpClient = this.clientService.httpAuthenticated
    try {
      const {
        data: { bundles: roles }
      } = await httpClient.post<{ bundles: SettingsBundle[] }>('/api/v0/settings/roles-list', {})
      return roles
    } catch (e) {
      console.error(e)
      return []
    }
  }

  private async fetchRole({ graphUser, roles }: { graphUser: OcUser; roles: SettingsBundle[] }) {
    const httpClient = this.clientService.httpAuthenticated
    const userAssignmentResponse = await httpClient.post<{ assignments: SettingsBundle[] }>(
      '/api/v0/settings/assignments-list',
      { account_uuid: graphUser.id }
    )
    const assignments = userAssignmentResponse.data?.assignments
    const roleAssignment = assignments.find((assignment) => 'roleId' in assignment)
    return roleAssignment ? roles.find((role) => role.id === roleAssignment.roleId) : null
  }

  private async fetchPermissions({ user }: { user: OcUser }) {
    const httpClient = this.clientService.httpAuthenticated
    try {
      const {
        data: { permissions }
      } = await httpClient.post<{ permissions: string[] }>('/api/v0/settings/permissions-list', {
        account_uuid: user.id
      })
      return permissions
    } catch (e) {
      console.error(e)
      return []
    }
  }

  private updateUserAbilities(permissions: string[]) {
    const abilities = getAbilities(permissions)
    this.ability.update(abilities)
  }
}
