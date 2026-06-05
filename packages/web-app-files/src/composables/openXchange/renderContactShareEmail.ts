type GettextFn = (msgid: string, parameters?: Record<string, string>) => string

export interface ContactShareEmailParams {
  contactName: string
  resourceName: string
  linkUrl: string
  password?: string
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const getContactShareEmailSubject = (resourceName: string, $gettext: GettextFn): string =>
  $gettext('«%{name}» was shared with you', { name: resourceName })

/**
 * Builds the subject and HTML body for the email sent to an address book
 * contact. The layout and footer mirror the OpenCloud backend notification
 * email templates (services/notifications/pkg/email/templates).
 */
export const renderContactShareEmail = (
  { contactName, resourceName, linkUrl, password }: ContactShareEmailParams,
  $gettext: GettextFn
): { subject: string; html: string } => {
  const subject = getContactShareEmailSubject(resourceName, $gettext)

  const greeting = $gettext('Dear %{name},', { name: contactName })
  const body = $gettext(
    '«%{resource}» has been shared with you. To access it, please use the link below.',
    { resource: resourceName }
  )
  const callToAction = $gettext('Open «%{resource}»', { resource: resourceName })
  const passwordLine = password
    ? $gettext('The link is protected by the following password: %{password}', { password })
    : ''

  const cellStyle =
    "font-weight:normal; font-size:0.8em; line-height:1.2em; font-family:verdana,'arial',sans;"

  const linkHtml = `<a href="${escapeHtml(linkUrl)}">${escapeHtml(callToAction)}</a>`
  const passwordHtml = passwordLine
    ? `\n                        <br><br>\n                        ${escapeHtml(passwordLine)}`
    : ''

  const html = `<!DOCTYPE html>
<html>
<body>
<table cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td>
            <table cellspacing="0" cellpadding="0" border="0" width="600px">
                <tr>
                    <td width="20px">&nbsp;</td>
                    <td style="${cellStyle}">
                        ${escapeHtml(greeting)}
                        <br><br>
                        ${escapeHtml(body)}
                        <br><br>
                        ${linkHtml}${passwordHtml}
                    </td>
                </tr>
                <tr>
                    <td colspan="2">&nbsp;</td>
                </tr>
                <tr>
                    <td width="20px">&nbsp;</td>
                    <td style="${cellStyle}">
                        <footer>
                            <br>
                            <br>
                            --- <br>
                            OpenCloud - a safe home for all your data<br>
                            <a href="https://opencloud.eu">https://opencloud.eu</a>
                        </footer>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">&nbsp;</td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>`

  return { subject, html }
}
