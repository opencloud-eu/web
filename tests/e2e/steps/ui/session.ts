import { Given, When, Then } from '../../environment/fixtures'
import { World } from '../../environment/world'
import { appConfig } from '../../playwright.config'
import { objects } from '../../support'
import { listenSSE } from '../../support/environment/sse'
import { expect } from '@playwright/test'

async function createNewSession(world: World, stepUser: string) {
  const { page } = await world.actorsEnvironment.createActor({
    key: stepUser,
    namespace: world.actorsEnvironment.generateNamespace(stepUser)
  })
  return new objects.runtime.Session({ page })
}

async function LogInUser({ world }: { world: World }, stepUser: string): Promise<void> {
  const sessionObject = await createNewSession(world, stepUser)
  const { page } = world.actorsEnvironment.getActor({ key: stepUser })

  const user =
    stepUser === 'Admin'
      ? world.usersEnvironment.getUser({ key: stepUser })
      : world.usersEnvironment.getCreatedUser({ key: stepUser })

  await page.goto(appConfig.baseUrl)
  await sessionObject.login(user, world.a11yEnabled)

  if (world.tags?.includes('@sse')) {
    void listenSSE(appConfig.baseUrl, user)
  }

  await page.locator('#web-content').waitFor()
}

When('{string} logs in', LogInUser)

async function LogOutUser({ world }: { world: World }, stepUser: string): Promise<void> {
  const actor = world.actorsEnvironment.getActor({ key: stepUser })
  const canLogout = !!(await actor.page.locator('#_userMenuButton').count())

  const sessionObject = new objects.runtime.Session({ page: actor.page })
  canLogout && (await sessionObject.logout())
  await actor.close()
}

When('{string} logs out', LogOutUser)

Then('{string} fails to log in', async ({ world }: { world: World }, stepUser: string) => {
  const sessionObject = await createNewSession(world, stepUser)
  const { page } = world.actorsEnvironment.getActor({ key: stepUser })
  const user = world.usersEnvironment.getCreatedUser({ key: stepUser })

  await page.goto(appConfig.baseUrl)
  await sessionObject.signIn(user.username, user.password)

  const errorLocator = appConfig.keycloak
    ? page.locator('.kc-feedback-text', {
        hasText: 'Account is disabled, contact your administrator.'
      })
    : page.locator('#oc-login-error-message')

  await expect(errorLocator).toBeVisible()
})

When(
  /^"([^"]*)" waits for token renewal via (iframe|refresh token)$/,
  async function (
    { world }: { world: World },
    stepUser: string,
    renewalType: string
  ): Promise<void> {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const application = new objects.runtime.Application({ page })

    if (renewalType === 'iframe') {
      await application.waitForTokenRenewalViaIframe()
    } else {
      await application.waitForTokenRenewalViaRefreshToken()
    }
  }
)

When(
  '{string} waits for token to expire',
  async function ({ world }: { world: World }, stepUser: string): Promise<void> {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    // wait for the token to expire
    await page.waitForTimeout(appConfig.tokenTimeout * 1000)
  }
)

When(
  '{string} navigates to new tab',
  async function ({ world }: { world: World }, stepUser: string): Promise<void> {
    const actor = world.actorsEnvironment.getActor({ key: stepUser })
    await actor.newTab()
  }
)

When(
  '{string} closes the current tab',
  async function ({ world }: { world: World }, stepUser: string): Promise<void> {
    const actor = world.actorsEnvironment.getActor({ key: stepUser })
    await actor.closeCurrentTab()
  }
)

Given('using {string} server', function ({ world }: { world: World }, server: string): void {
  switch (server) {
    case 'LOCAL':
      appConfig.federatedServer = false
      break
    case 'FEDERATED':
      appConfig.federatedServer = true
      break
    default:
      throw new Error(`Invalid server type: ${server}\nUse one of these: [LOCAL, FEDERATED]`)
  }
})

Then(
  '{string} should be logged out',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    await expect(page.locator('#web-content')).toBeHidden()
    await expect(page.locator('#exitAnchor')).toBeVisible()
  }
)
