import { urlJoin } from '../../utils/urlJoin'
import { checkResponseStatus, request } from '../http'
import { User } from '../../types'

export const getOpenWithWebUrl = async ({
  user,
  fileId,
  editorName
}: {
  user: User
  fileId: string
  editorName: string
}): Promise<string> => {
  const response = await request({
    method: 'POST',
    path: urlJoin('app', 'open-with-web', `?file_id=${fileId}&app_name=${editorName}`),
    user: user
  })
  checkResponseStatus(response, 'Failed while getting url')
  const respBody = (await response.json()) as { uri: string }
  return respBody.uri
}
