import { useService } from '../service'
import { NavigationFailure } from 'vue-router'

export interface AuthServiceInterface {
  /**
   * Resolves to `true` if the token got renewed, so the caller can retry its request.
   */
  handleAuthError(route: any, error?: unknown): Promise<boolean>
  signinSilent(): Promise<unknown>
  /**
   * Silent renewal that retries network errors. Resolves to whether it succeeded.
   * Concurrent `renewToken()` callers share one attempt, direct `signinSilent()` calls
   * (e.g. the token timer) don't join it.
   */
  renewToken(): Promise<boolean>
  logoutUser(): Promise<void | NavigationFailure>
  logoutGuest(): Promise<void | NavigationFailure>
  getRefreshToken(): Promise<string>
}

export const useAuthService = (): AuthServiceInterface => {
  return useService('$authService')
}
