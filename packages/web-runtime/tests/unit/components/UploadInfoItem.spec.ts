import UploadInfoItem, {
  UploadError,
  UploadResult
} from '../../../src/components/UploadInfoItem.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { ResourceListItem } from '@opencloud-eu/web-pkg'
import { DavHttpError, HttpError } from '@opencloud-eu/web-client'

const selectors = {
  message: '.upload-info-message',
  itemStatus: '.upload-info-item-status'
}

const file = { name: 'file', path: '/', type: 'file', meta: { uploadId: '1' } }
const folder = {
  name: 'folder',
  path: '/',
  type: 'folder',
  meta: { uploadId: '1', isFolder: true }
}

describe('UploadInfoItem component', () => {
  describe('status', () => {
    it.each([
      { status: 'success', uploadsPaused: false, expected: 'Uploaded' },
      { status: 'cancelled', uploadsPaused: false, expected: 'Cancelled' },
      { status: 'error', uploadsPaused: false, expected: 'Failed' },
      { status: undefined, uploadsPaused: false, expected: 'Uploading' },
      { status: undefined, uploadsPaused: true, expected: 'Paused' }
    ])(
      'tells screen readers "$expected" for status $status',
      ({ status, uploadsPaused, expected }) => {
        const { wrapper } = getWrapper({ item: { ...file, status }, uploadsPaused })
        expect(wrapper.find(selectors.itemStatus).text()).toBe(expected)
      }
    )
  })

  describe('message', () => {
    it('is not shown without an error', () => {
      const { wrapper } = getWrapper({ item: file })
      expect(wrapper.find(selectors.message).exists()).toBeFalsy()
    })
    it('shows an unknown error', () => {
      const { wrapper } = getWrapper({ item: file, error: new HttpError('', undefined) })
      expect(wrapper.find(selectors.message).text()).toBe('Unknown error')
    })
    it('shows the message of an XML error response', () => {
      const { wrapper } = getWrapper({
        item: file,
        error: new HttpError(
          'tus: unexpected response while creating upload, originated from request (method: POST, url: x, response code: 400, response text: <?xml version="1.0" encoding="UTF-8"?><d:error xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns"><s:exception>Sabre\\DAV\\Exception\\BadRequest</s:exception><s:message>name too long</s:message></d:error>, request id: n/a)',
          undefined
        )
      })
      expect(wrapper.find(selectors.message).text()).toBe('name too long')
    })
    it.each([
      {
        source: 'file upload',
        item: file,
        error: new HttpError(
          'tus: unexpected response while creating upload, originated from request (method: POST, url: x, response code: 423, response text: , request id: n/a)',
          undefined
        ),
        message: 'This item is locked'
      },
      {
        source: 'folder creation',
        item: folder,
        error: new HttpError('locked', undefined, 423),
        message: "The folder you're uploading to is locked"
      }
    ])(
      'shows the locked message when a $source hits a locked resource',
      ({ item, error, message }) => {
        const { wrapper } = getWrapper({ item, error })
        expect(wrapper.find(selectors.message).text()).toBe(message)
      }
    )
    it.each([
      {
        error: new DavHttpError(
          'name validation failed: must not contain \\',
          undefined,
          undefined,
          400
        ),
        message: 'name validation failed: must not contain \\',
        reason: 'a server message'
      },
      {
        error: new DavHttpError('', undefined, undefined, 507),
        message: 'Quota exceeded',
        reason: 'status 507'
      },
      {
        error: new DavHttpError('', undefined, undefined, 500),
        message: 'Unknown error',
        reason: 'no server message'
      },
      { error: new Error('Failed to fetch'), message: 'Unknown error', reason: 'a network error' }
    ])('shows "$message" for a failed folder creation with $reason', ({ error, message }) => {
      const { wrapper } = getWrapper({ item: folder, error: error as UploadError })
      expect(wrapper.find(selectors.message).text()).toBe(message)
    })
    it('does not show the technical message of a non-webdav error with a status', () => {
      const { wrapper } = getWrapper({
        item: file,
        error: Object.assign(
          new Error('Failed request with status: 500. Internal Server Error request-Id: 1f2e3d'),
          { statusCode: 500 }
        ) as UploadError
      })
      expect(wrapper.find(selectors.message).text()).toBe('Unknown error')
    })
    it.each([
      { status: 423, responseText: '', message: 'This item is locked' },
      { status: 507, responseText: '', message: 'Quota exceeded' },
      {
        status: 500,
        responseText:
          '<?xml version="1.0" encoding="UTF-8"?><d:error xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns"><s:exception>Sabre\\DAV\\Exception</s:exception><s:message>internal server error</s:message></d:error>',
        message: 'internal server error'
      },
      { status: 500, responseText: '', message: 'Unknown error' }
    ])(
      'shows "$message" for a failed xhr upload with status $status',
      ({ status, responseText, message }) => {
        const { wrapper } = getWrapper({
          item: file,
          error: Object.assign(
            new Error(
              'This looks like a network error, the endpoint might be blocked by an internet provider or a firewall.'
            ),
            { request: { status, responseText } }
          ) as unknown as UploadError
        })
        expect(wrapper.find(selectors.message).text()).toBe(message)
      }
    )
  })

  describe('resource', () => {
    it('makes a folder clickable and links into it', () => {
      const { wrapper } = getWrapper({
        item: {
          ...folder,
          path: '',
          targetRoute: { name: 'files', params: { driveAliasAndItem: 'some/drive/alias' } }
        }
      })
      const resource = wrapper.findComponent<typeof ResourceListItem>('resource-list-item-stub')
      expect(resource.props().isResourceClickable).toBeTruthy()
      expect(resource.props().link).toMatchObject({
        params: { driveAliasAndItem: 'some/drive/alias/folder' }
      })
    })
    it('does not make a file clickable', () => {
      const { wrapper } = getWrapper({
        item: { ...file, targetRoute: { name: 'files', params: { driveAliasAndItem: 'a' } } }
      })
      const resource = wrapper.findComponent<typeof ResourceListItem>('resource-list-item-stub')
      expect(resource.props().isResourceClickable).toBeFalsy()
    })
  })
})

function getWrapper({
  item,
  error,
  uploadsPaused = false
}: {
  item: Omit<Partial<UploadResult>, 'meta'> & { meta: Partial<UploadResult['meta']> }
  error?: UploadError
  uploadsPaused?: boolean
}) {
  return {
    wrapper: shallowMount(UploadInfoItem, {
      props: { item: item as UploadResult, error, uploadsPaused },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
