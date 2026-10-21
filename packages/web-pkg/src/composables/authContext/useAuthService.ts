import { useService } from '../service'
import { NavigationFailure } from 'vue-router'

export interface AuthServiceInterface {
  handleAuthError(route: any, error?: unknown): any
  signinSilent(): Promise<unknown>
  /**
   * Silent renewal that retries network errors. Resolves to whether it succeeded.
   * Concurrent callers share one attempt.
   */
  renewToken(): Promise<boolean>
  logoutUser(): Promise<void | NavigationFailure>
  getRefreshToken(): Promise<string>
}

export const useAuthService = (): AuthServiceInterface => {
  return useService('$authService')
}
