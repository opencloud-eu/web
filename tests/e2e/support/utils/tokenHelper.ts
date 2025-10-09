import { Browser } from '@playwright/test'
import { Session } from '../objects/runtime'
import { TokenProviderType } from '../environment'
import { config } from '../../config'
import { User } from '../types'

export const initializeUser = async ({
  browser,
  user,
  url = config.baseUrl,
  waitForSelector = null
}: {
  browser: Browser
  user: User
  url?: string
  tokenType?: TokenProviderType
  waitForSelector?: string
}): Promise<void> => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await ctx.newPage()

  await page.goto(url)
  await new Session({ page }).login(user)

  waitForSelector && (await page.locator(waitForSelector).waitFor())

  await page.close()
  await ctx.close()
}
