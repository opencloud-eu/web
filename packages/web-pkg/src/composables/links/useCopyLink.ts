import { useMessages } from '../piniaStores'
import { useGettext } from 'vue3-gettext'
import { LinkShare } from '@opencloud-eu/web-client'
import { useClipboard } from '@vueuse/core'
import { isPromiseFulfilled, isPromiseRejected } from '../../helpers'

/**
 * Dedicated composable for copying created links to clipboard because it requires
 * special handling for Safari. For this to work you need to pass the link create method
 * to copyLink so that the link is created within the same user interaction as the clipboard write.
 *
 * This composable also takes care of showing success and error messages.
 */
export const useCopyLink = () => {
  const { $gettext, $ngettext } = useGettext()
  const { showMessage, showErrorMessage } = useMessages()
  const { copy } = useClipboard()

  function getTextToCopy({
    result,
    password
  }: {
    result: PromiseSettledResult<LinkShare>[]
    password?: string
  }) {
    const succeeded = result.filter(isPromiseFulfilled)

    // Only copy to clipboard if the user tries to create one single link
    if (!succeeded.length || result.length !== 1) {
      return ''
    }

    if (password) {
      return $gettext('%{link} Password: %{password}', {
        link: succeeded[0].value.webUrl,
        password
      })
    }

    return succeeded[0].value.webUrl
  }

  function showMessages({
    result,
    copied
  }: {
    result: PromiseSettledResult<LinkShare>[]
    copied: boolean
  }) {
    const succeeded = result.filter(isPromiseFulfilled)
    if (succeeded.length) {
      let successMessage = $gettext('Link has been created successfully')

      if (result.length === 1) {
        successMessage = copied
          ? $gettext('The link has been copied to your clipboard.')
          : $gettext("The link has been created, but it couldn't be copied to your clipboard.")
      }

      showMessage({
        title: $ngettext(successMessage, 'Links have been created successfully.', succeeded.length)
      })
    }

    const failed = result.filter(isPromiseRejected)
    if (failed.length) {
      showErrorMessage({
        errors: failed.map(({ reason }) => reason),
        title: $ngettext('Failed to create link', 'Failed to create links', failed.length)
      })
    }
  }

  const copyLink = async ({
    createLinkHandler,
    password
  }: {
    createLinkHandler: () => Promise<PromiseSettledResult<LinkShare>[]>
    password?: string
  }) => {
    // special handling for Safari because it doesn't allow async clipboard writes. works in most other browsers as well.
    // see https://wolfgangrittner.dev/how-to-use-clipboard-api-in-safari/ and https://developer.apple.com/forums/thread/691873
    if (typeof ClipboardItem && navigator.clipboard.write) {
      const resultPromise = createLinkHandler()
      const blobPromise = resultPromise.then((result) => {
        const textToCopy = getTextToCopy({ result, password })
        return new Blob([textToCopy], { type: 'text/plain' })
      })
      // a failing link creation is handled by awaiting resultPromise below
      blobPromise.catch((): void => undefined)

      let copied = true
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blobPromise })])
      } catch (e) {
        copied = false
        console.warn('Unable to copy link to clipboard', e)
      }

      const result = await resultPromise
      showMessages({ result, copied })
      return
    }

    // edge case for browsers that don't support ClipboardItem (e.g. Firefox)
    const result = await createLinkHandler()
    const textToCopy = getTextToCopy({ result, password })
    if (textToCopy) {
      // copy() falls back to document.execCommand('copy'), which doesn't report failures
      await copy(textToCopy)
    }
    showMessages({ result, copied: true })
  }

  return { copyLink }
}
