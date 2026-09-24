import { Page, expect } from '@playwright/test'
import util from 'util'
import { resourceNameSelector } from './shared'

export const vaultSetupPassphraseInput = '#vault-setup-passphrase'
export const unlockVaultBtn = '#vault-unlock-submit'
export const vaultPassphraseInput = '#vault-passphrase'
export const filesContextLockVaultAction =
  'div[id^="context-menu-drop"] button.oc-files-actions-lock-vault'

export const unlockVault = async ({
  page,
  passphrase
}: {
  page: Page
  passphrase: string
}): Promise<void> => {
  const unlockButton = page.locator(unlockVaultBtn)
  await expect(unlockButton).toBeDisabled()
  await page.locator(vaultPassphraseInput).fill(passphrase)
  await unlockButton.click()
}

export const setupVaultPassword = async ({ page, password }: { page: Page; password: string }) => {
  await page.locator(vaultSetupPassphraseInput).fill(password)
  // Committing the passphrase writes the integrity token onto the new folder.
  const proppatchPromise = page.waitForResponse((resp) => resp.request().method() === 'PROPPATCH')
  await page.locator(unlockVaultBtn).click()
  await proppatchPromise
}

export const enterVault = async ({
  page,
  vault,
  passphrase
}: {
  page: Page
  vault: string
  passphrase: string
}): Promise<void> => {
  await page.locator(util.format(resourceNameSelector, vault)).click()
  await unlockVault({ page, passphrase })
}

export const lockVault = async ({ page, vault }: { page: Page; vault: string }): Promise<void> => {
  await page.locator(util.format(resourceNameSelector, vault)).click({ button: 'right' })
  await page.locator(filesContextLockVaultAction).click()
}
