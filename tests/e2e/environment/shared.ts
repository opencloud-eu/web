import { Browser } from '@playwright/test'

export const state: {
  browser: Browser
  projectName: string
} = {
  browser: undefined,
  projectName: ''
}
