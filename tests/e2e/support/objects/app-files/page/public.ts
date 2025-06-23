import { Download, Page } from '@playwright/test'
import { File } from '../../../types'
import util from 'util'
import path from 'path'
import * as po from '../resource/actions'

const passwordInput = 'input[type="password"]'
const fileUploadInput = '//input[@id="files-file-upload-input"]'
const dropUploadResourceSelector = '.upload-info-items [data-test-resource-name="%s"]'
const toggleUploadDetailsButton = '.upload-info-toggle-details-btn'
const uploadInfoSuccessLabelSelector = '.upload-info-success'
const publicLinkAuthorizeButton = '.oc-login-authorize-button'

export class Public {
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  async open({ url }: { url: string }): Promise<void> {
    await this.#page.goto(url)
  }

  async authenticate({ password }: { password: string }): Promise<void> {
    await this.#page.locator(passwordInput).fill(password)
    await this.#page.locator(publicLinkAuthorizeButton).click()
    await this.#page.locator('#web-content').waitFor()
  }

  async dropUpload({ resources }: { resources: File[] }): Promise<void> {
    const startUrl = this.#page.url()
    await this.#page.locator(fileUploadInput).setInputFiles(resources.map((file) => file.path))
    const names = resources.map((file) => path.basename(file.name))
    await this.#page.locator(uploadInfoSuccessLabelSelector).waitFor()
    await this.#page.locator(toggleUploadDetailsButton).click()
    await Promise.all(
      names.map((name) =>
        this.#page.locator(util.format(dropUploadResourceSelector, name)).waitFor()
      )
    )
    await this.#page.goto(startUrl)
  }

  async reload(): Promise<void> {
    await this.#page.reload()
  }

  async download(args: Omit<po.downloadResourcesArgs, 'page'>): Promise<Download[]> {
    const startUrl = this.#page.url()
    const downloads = await po.downloadResources({ ...args, page: this.#page })
    await this.#page.goto(startUrl)
    return downloads
  }

  async rename(args: Omit<po.renameResourceArgs, 'page'>): Promise<void> {
    const startUrl = this.#page.url()
    await po.renameResource({ ...args, page: this.#page })
    await this.#page.goto(startUrl)
  }

  async upload(args: Omit<po.uploadResourceArgs, 'page'>): Promise<void> {
    const startUrl = this.#page.url()
    await po.uploadResource({ ...args, page: this.#page })
    await this.#page.goto(startUrl)
    await this.#page.locator('body').click()
  }

  async delete(args: Omit<po.deleteResourceArgs, 'page'>): Promise<void> {
    const startUrl = this.#page.url()
    await po.deleteResource({ ...args, page: this.#page, isPublicLink: true })
    await this.#page.goto(startUrl)
  }

  async expectThatLinkIsDeleted({ url }: { url: string }): Promise<void> {
    await po.expectThatPublicLinkIsDeleted({ page: this.#page, url })
  }

  async getContentOfOpenDocumentOrMicrosoftWordDocument({
    page,
    editorToOpen
  }: {
    page: Page
    editorToOpen: string
  }): Promise<string> {
    return await po.openAndGetContentOfDocument({ page, editorToOpen })
  }

  async fillContentOfOpenDocumentOrMicrosoftWordDocument({
    page,
    text,
    editorToOpen
  }: {
    page: Page
    text: string
    editorToOpen: string
  }): Promise<void> {
    return await po.fillContentOfDocument({ page, text, editorToOpen })
  }
}
