import { When, Then } from '@cucumber/cucumber'
import { World } from '../../environment'
import { config } from '../../../config'
import { expect } from '@playwright/test'
import { TokenEnvironmentFactory } from '../../../support/environment/token'

When(
  '{string} opens the app in embed mode with delegated authentication',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = await this.actorsEnvironment.createActor({
      key: stepUser,
      namespace: this.actorsEnvironment.generateNamespace(this.feature.name, stepUser)
    })

    const user = this.usersEnvironment.getCreatedUser({ key: stepUser })

    const tokenEnvironment = TokenEnvironmentFactory(config.keycloak ? 'keycloak' : null)
    const { accessToken } = tokenEnvironment.getToken({ user })

    const appUrl = `${config.baseUrl}?embed=true&embed-delegate-authentication=true`

    // Serve a test harness page at the same origin so postMessage works
    // with the default targetOrigin. The harness embeds the app in an
    // iframe and replies to the delegated-auth token request.
    await page.route('**/embed-test-harness', (route) => {
      route.fulfill({
        contentType: 'text/html',
        body: `<!DOCTYPE html>
<html>
<body>
<iframe id="embed-frame" src="${appUrl}" style="width:100%;height:100vh;border:none;"></iframe>
<script>
  window.addEventListener('message', function(event) {
    if (event.data && event.data.name === 'opencloud-embed:request-token') {
      var iframe = document.getElementById('embed-frame');
      iframe.contentWindow.postMessage({
        name: 'opencloud-embed:update-token',
        data: { access_token: '${accessToken}' }
      }, '*');
    }
  });
</script>
</body>
</html>`
      })
    })

    await page.goto(`${config.baseUrl}/embed-test-harness`)

    // Wait for the embedded app to fully load
    const frame = page.frameLocator('#embed-frame')
    await frame.locator('#web-content').waitFor({ timeout: 30000 })
  }
)

Then(
  '{string} should see the embed mode actions',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const frame = page.frameLocator('#embed-frame')

    await expect(frame.locator('[data-testid="button-cancel"]')).toBeVisible({ timeout: 15000 })
    await expect(frame.locator('[data-testid="button-select"]')).toBeVisible()
  }
)

Then(
  '{string} should not see the full web UI',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const frame = page.frameLocator('#embed-frame')

    // In embed mode the user menu and app switcher should be hidden
    await expect(frame.locator('#_userMenuButton')).not.toBeVisible()
    await expect(frame.locator('#_appSwitcherButton')).not.toBeVisible()
  }
)
