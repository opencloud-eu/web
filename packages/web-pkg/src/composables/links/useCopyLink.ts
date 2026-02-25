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

  const getTextToCopy = ({
    result,
    password
  }: {
    result: PromiseSettledResult<LinkShare>[]
    password?: string
  }) => {
    const succeeded = result.filter(isPromiseFulfilled)

    let copyToClipboardText = ''
    if (succeeded.length) {
      let successMessage = $gettext('Link has been created successfully')

      if (result.length === 1) {
        // Only copy to clipboard if the user tries to create one single link
        try {
          copyToClipboardText = password
            ? $gettext(
                '%{link} Password:%{password}',
                { link: succeeded[0].value.webUrl, password },
                true
              )
            : succeeded[0].value.webUrl

          successMessage = $gettext('The link has been copied to your clipboard.')
        } catch (e) {
          console.warn('Unable to copy link to clipboard', e)
        }
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

    return copyToClipboardText
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
      await new Promise<void>((resolve, reject) => {
        const text = new ClipboardItem({
          'text/plain': createLinkHandler()
            .then((result) => {
              const textToCopy = getTextToCopy({ result, password })
              const blob = new Blob([textToCopy], { type: 'text/plain' })
              resolve()
              return blob
            })
            .catch((error) => {
              reject()
              throw error
            })
        })

        navigator.clipboard.write([text])
      })
    } else {
      // edge case for browsers that don't support ClipboardItem (e.g. Firefox)
      const result = await createLinkHandler()
      const textToCopy = getTextToCopy({ result, password })
      if (textToCopy) {
        copy(textToCopy)
      }
    }
  }

  return { copyLink }
}
