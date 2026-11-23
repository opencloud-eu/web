import { createdTokenStore, federatedTokenStore, keycloakTokenStore } from '../store/token'
import { Token, User } from '../types'
import { appConfig } from '../../playwright.config'

export type TokenProviderType = 'keycloak' | null | undefined

export function TokenEnvironmentFactory(type?: TokenProviderType) {
  switch (type) {
    case 'keycloak':
      return new KeycloakTokenEnvironment()
    default:
      return new IdpTokenEnvironment()
  }
}

class IdpTokenEnvironment {
  getToken({ user }: { user: User }): Token {
    const store = appConfig.federatedServer ? federatedTokenStore : createdTokenStore
    return store.get(user.username)
  }

  setToken({ user, token }: { user: User; token: Token }): Token {
    const store = appConfig.federatedServer ? federatedTokenStore : createdTokenStore
    store.set(user.username, token)
    return token
  }
}

class KeycloakTokenEnvironment {
  getToken({ user }: { user: User }): Token {
    return keycloakTokenStore.get(user.id)
  }

  setToken({ user, token }: { user: User; token: Token }): Token {
    keycloakTokenStore.set(user.id, token)
    return token
  }
}
