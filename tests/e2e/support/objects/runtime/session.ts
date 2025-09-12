import { Page } from '@playwright/test'
import { User } from '../../types'
import { config } from '../../../config'
import { checkA11yOrLocalization } from '../../utils/accessibility'

export class Session {
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  signIn(username: string, password: string, a11y = false): Promise<void> {
    if (config.keycloak) {
      return this.keycloakSignIn(username, password)
    }
    return this.idpSignIn(username, password, a11y)
  }

  async idpSignIn(username: string, password: string, a11y: boolean): Promise<void> {
    await this.#page.locator('#oc-login-username').fill(username)
    await this.#page.locator('#oc-login-password').fill(password)
    if (a11y) {
      await checkA11yOrLocalization(this.#page, 'before clicking login submit', '#root')
    }
    await this.#page.locator('button[type="submit"]').click()
  }

  async keycloakSignIn(username: string, password: string): Promise<void> {
    await this.#page.locator('#username').fill(username)
    await this.#page.locator('#password').fill(password)
    await this.#page.locator('#kc-login').click()
  }

  async login(user: User, a11y?: boolean): Promise<void> {
    const { username, password } = user

    await Promise.all([
      this.#page.waitForResponse(
        (resp) =>
          resp.url().endsWith('/token') &&
          resp.status() === 200 &&
          resp.request().method() === 'POST'
      ),
      this.signIn(username, password, a11y)
    ])
  }

  async logout(): Promise<void> {
    await this.#page.locator('#_userMenuButton').click()
    await this.#page.locator('#oc-topbar-account-logout').click()
  }
}
