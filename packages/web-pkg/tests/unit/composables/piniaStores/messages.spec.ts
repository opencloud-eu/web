import { AxiosHeaders, AxiosResponse } from 'axios'
import { HttpError } from '@opencloud-eu/web-client'
import { useMessages } from '../../../../src/composables/piniaStores'
import { createPinia, setActivePinia } from 'pinia'

describe('useMessages', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('method "showErrorMessage"', () => {
    it('logs the request id of a fetch response', () => {
      const response = new Response(null, { headers: { 'X-Request-Id': 'fetch-id' } })
      const message = useMessages().showErrorMessage({
        title: 'error',
        errors: [new HttpError('error', response, 500)]
      })

      expect(message.errorLogContent).toEqual('X-Request-Id: fetch-id')
    })

    it('logs the request id of an axios response', () => {
      const response = {
        headers: new AxiosHeaders({ 'X-Request-Id': 'axios-id' })
      } as AxiosResponse
      const message = useMessages().showErrorMessage({
        title: 'error',
        errors: [new HttpError('error', response, 500)]
      })

      expect(message.errorLogContent).toEqual('X-Request-Id: axios-id')
    })

    it('logs the request id of an axios response with plain headers', () => {
      const response = { headers: { 'x-request-id': 'plain-id' } } as unknown as AxiosResponse
      const message = useMessages().showErrorMessage({
        title: 'error',
        errors: [new HttpError('error', response, 500)]
      })

      expect(message.errorLogContent).toEqual('X-Request-Id: plain-id')
    })

    it('logs nothing for errors without a response', () => {
      const message = useMessages().showErrorMessage({
        title: 'error',
        errors: [new Error('error')]
      })

      expect(message.errorLogContent).toEqual('')
    })
  })
})
