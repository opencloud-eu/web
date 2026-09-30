import { useGettext } from 'vue3-gettext'

// validates usernames like the server does: no special characters except . and _,
// no leading number, optionally followed by an email domain
const userNamePattern = new RegExp(
  "^[a-zA-Z_][a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*(@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)*$"
)

export function useUserNameValidation() {
  const { $gettext } = useGettext()

  /**
   * Returns the error message for an invalid user name, or an empty string if it is valid.
   * Does not check whether the user name is already taken.
   */
  function getUserNameError(userName: string) {
    if (userName.trim() === '') {
      return $gettext('User name cannot be empty')
    }
    if (userName.includes(' ')) {
      return $gettext('User name cannot contain white spaces')
    }
    if (userName.length > 255) {
      return $gettext('User name cannot exceed 255 characters')
    }
    if (!isNaN(parseInt(userName[0]))) {
      return $gettext('User name cannot start with a number')
    }
    if (!userNamePattern.test(userName)) {
      return $gettext('User name cannot contain special characters')
    }
    return ''
  }

  return { getUserNameError }
}
