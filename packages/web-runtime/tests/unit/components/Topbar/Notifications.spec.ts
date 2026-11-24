import Notifications from '../../../../src/components/Topbar/Notifications.vue'
import { Notification } from '../../../../src/helpers/notifications'
import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { SpaceResource } from '@opencloud-eu/web-client'
import { RouterLink, RouteLocationNamedRaw, RouteLocationNormalizedLoaded } from 'vue-router'
import { AxiosResponse } from 'axios'
import { UserAvatar, useMessages, useSpacesStore } from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { MESSAGE_TYPE } from '@opencloud-eu/web-client/sse'

const selectors = {
  notificationBellStub: 'notification-bell-stub',
  userAvatarStub: 'user-avatar-stub',
  noNewNotifications: '.oc-notifications-no-new',
  markAll: '.oc-notifications-mark-all',
  notificationsLoading: '.oc-notifications-loading',
  notificationItem: '.oc-notifications-item',
  notificationSubject: '.oc-notifications-subject',
  notificationMessage: '.oc-notifications-message',
  notificationLink: '.oc-notifications-link'
}

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn(),
  useAppDefaults: vi.fn()
}))

describe('Notification component', () => {
  it('renders the notification bell and no notifications if there are none', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.notificationBellStub).exists()).toBeTruthy()
    expect(wrapper.find(selectors.noNewNotifications).exists()).toBeTruthy()
    expect(wrapper.find(selectors.markAll).exists()).toBeFalsy()
  })
  it('renders a set of notifications', async () => {
    const notifications = [
      mock<Notification>({
        messageRich: undefined,
        computedMessage: undefined
      })
    ]
    const { wrapper } = getWrapper({ notifications })
    await flushPromises()
    expect(wrapper.find(selectors.noNewNotifications).exists()).toBeFalsy()
    expect(wrapper.findAll(selectors.notificationItem).length).toBe(notifications.length)
  })
  it('renders the loading state', async () => {
    const notifications = [mock<Notification>({ messageRich: undefined })]
    const { wrapper } = getWrapper({ notifications })
    await wrapper.vm.$nextTick()
    expect(wrapper.find(selectors.notificationsLoading).exists()).toBeTruthy()
  })
  it('marks all notifications as read', async () => {
    const notifications = [mock<Notification>({ messageRich: undefined })]
    const { wrapper, mocks } = getWrapper({ notifications })
    await flushPromises()
    await wrapper.find(selectors.markAll).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find(selectors.notificationItem).exists()).toBeFalsy()
    expect(mocks.$clientService.httpAuthenticated.delete).toHaveBeenCalledTimes(1)
  })
  it('keeps the notifications and shows an error if marking all as read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const notifications = [mock<Notification>({ messageRich: undefined })]
    const { wrapper, mocks } = getWrapper({ notifications })
    const error = new Error('delete failed')
    mocks.$clientService.httpAuthenticated.delete.mockRejectedValue(error)
    await flushPromises()
    await wrapper.find(selectors.markAll).trigger('click')
    await flushPromises()
    expect(wrapper.findAll(selectors.notificationItem).length).toBe(notifications.length)
    const { showErrorMessage } = useMessages()
    expect(showErrorMessage).toHaveBeenCalledWith(expect.objectContaining({ errors: [error] }))
  })
  describe('drop', () => {
    it('hides when a linked notification is clicked', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        object_type: 'share',
        messageRichParameters: { share: { id: '1' } },
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      await wrapper.find(`${selectors.notificationItem} router-link-stub`).trigger('click')
      expect(hideDropMock).toHaveBeenCalledTimes(1)
    })
    it('stays open when a notification without link is clicked', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        messageRichParameters: undefined,
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      await wrapper.find(`${selectors.notificationItem} > div`).trigger('click')
      expect(hideDropMock).not.toHaveBeenCalled()
    })
    it('stays open when marking all notifications as read', async () => {
      const notifications = [mock<Notification>({ messageRich: undefined })]
      const { wrapper } = getWrapper({ notifications })
      await flushPromises()
      await wrapper.find(selectors.markAll).trigger('click')
      expect(hideDropMock).not.toHaveBeenCalled()
    })
  })
  describe('refetch', () => {
    it('refetches the notifications when the drop opens', async () => {
      const notifications = [mock<Notification>({ messageRich: undefined })]
      const { wrapper, mocks } = getWrapper({ notifications })
      await flushPromises()
      expect(wrapper.findAll(selectors.notificationItem).length).toBe(1)

      mockFetchResponse(mocks, [])
      wrapper.findComponent(OcDropStub).vm.$emit('showDrop')
      await flushPromises()
      expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(2)
      expect(wrapper.find(selectors.notificationItem).exists()).toBeFalsy()
      expect(wrapper.find(selectors.noNewNotifications).exists()).toBeTruthy()
    })
    it('refetches the notifications when the tab becomes visible again', async () => {
      const notifications = [mock<Notification>({ messageRich: undefined })]
      const { wrapper, mocks } = getWrapper({ notifications })
      await flushPromises()

      mockFetchResponse(mocks, [])
      document.dispatchEvent(new Event('visibilitychange'))
      await flushPromises()
      expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(2)
      expect(wrapper.find(selectors.notificationItem).exists()).toBeFalsy()
      wrapper.unmount()
    })
    it('does not refetch the notifications when the tab becomes hidden', async () => {
      const visibilityStateSpy = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden')
      const { wrapper, mocks } = getWrapper()
      await flushPromises()

      document.dispatchEvent(new Event('visibilitychange'))
      await flushPromises()
      expect(mocks.$clientService.httpAuthenticated.get).toHaveBeenCalledTimes(1)
      wrapper.unmount()
      visibilityStateSpy.mockRestore()
    })
    it('does not show the loading state while refetching', async () => {
      const notifications = [mock<Notification>({ messageRich: undefined })]
      const { wrapper } = getWrapper({ notifications })
      await flushPromises()

      wrapper.findComponent(OcDropStub).vm.$emit('showDrop')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.notificationsLoading).exists()).toBeFalsy()
      expect(wrapper.findAll(selectors.notificationItem).length).toBe(1)
    })
    it('does not duplicate a fetched notification that also arrives via SSE', async () => {
      const notification = getNotification({ notification_id: '1' })
      const { wrapper, mocks } = getWrapper({ notifications: [notification], supportSSE: true })
      await flushPromises()
      const onSSENotification =
        mocks.$clientService.sseAuthenticated.addEventListener.mock.calls.find(
          ([type]) => type === MESSAGE_TYPE.NOTIFICATION
        )[1] as (event: MessageEvent) => void

      onSSENotification(new MessageEvent('message', { data: JSON.stringify(notification) }))
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll(selectors.notificationItem).length).toBe(1)
    })
    it('unsubscribes from the SSE stream it subscribed to on unmount', async () => {
      const { wrapper, mocks } = getWrapper({ supportSSE: true })
      await flushPromises()
      const stream = mocks.$clientService.sseAuthenticated
      const newStream = mock<EventSource>()
      ;(mocks.$clientService as { sseAuthenticated: EventSource }).sseAuthenticated = newStream

      wrapper.unmount()
      expect(stream.removeEventListener).toHaveBeenCalledWith(
        MESSAGE_TYPE.NOTIFICATION,
        expect.any(Function)
      )
      expect(newStream.removeEventListener).not.toHaveBeenCalled()
    })
    it('does not restore notifications marked as read while refetching', async () => {
      const notifications = [getNotification({ notification_id: '1' })]
      const { wrapper, mocks } = getWrapper({ notifications })
      await flushPromises()

      let resolveFetch: (response: AxiosResponse) => void
      mocks.$clientService.httpAuthenticated.get.mockReturnValue(
        new Promise((resolve) => (resolveFetch = resolve))
      )
      wrapper.findComponent(OcDropStub).vm.$emit('showDrop')
      await wrapper.vm.$nextTick()
      await wrapper.find(selectors.markAll).trigger('click')
      resolveFetch(mock<AxiosResponse>({ data: { ocs: { data: notifications } }, headers: {} }))
      await flushPromises()
      expect(wrapper.find(selectors.notificationItem).exists()).toBeFalsy()
    })
  })
  describe('avatar', () => {
    it('loads based on the username', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        user: 'einstein'
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const avatarImageStub = wrapper.findComponent<typeof UserAvatar>(selectors.userAvatarStub)
      expect(avatarImageStub.attributes('userid')).toEqual(notification.user)
      expect(avatarImageStub.attributes('username')).toEqual(notification.user)
    })
    it('loads based on the rich parameters', async () => {
      const displayname = 'Albert Einstein'
      const name = 'einstein'
      const id = '12345'
      const notification = mock<Notification>({
        messageRich: undefined,
        messageRichParameters: { user: { displayname, name, id } }
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const avatarImageStub = wrapper.findComponent<typeof UserAvatar>(selectors.userAvatarStub)
      expect(avatarImageStub.attributes('userid')).toEqual(id)
      expect(avatarImageStub.attributes('username')).toEqual(displayname)
    })
  })
  describe('subject', () => {
    it('displays if no message given', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        message: undefined,
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      expect(wrapper.find(selectors.notificationSubject).exists()).toBeTruthy()
    })
  })
  describe('message', () => {
    it('displays simple message if messageRich not given', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        message: 'some message',
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      expect(wrapper.find(selectors.notificationMessage).text()).toEqual(notification.message)
    })
    it('displays rich message and interpolates the text', async () => {
      const notification = mock<Notification>({
        messageRich: '{user} shared {resource} with you',
        messageRichParameters: {
          user: { displayname: 'Albert Einstein' },
          resource: { name: 'someFile.txt' }
        },
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      expect(wrapper.find(selectors.notificationMessage).text()).toEqual(
        'Albert Einstein shared someFile.txt with you'
      )
    })
    it('escapes the simple message', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        message: 'mary shared <img src=x onerror=alert(1)>.txt with you',
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const messageEl = wrapper.find(selectors.notificationMessage)
      expect(messageEl.find('img').exists()).toBeFalsy()
      expect(messageEl.text()).toEqual(notification.message)
    })
    it('does not interpolate placeholders inside the inserted values', async () => {
      const notification = mock<Notification>({
        messageRich: '{user} shared {resource} with you',
        messageRichParameters: {
          user: { displayname: '{resource}' },
          resource: { name: 'someFile.txt' }
        },
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const messageEl = wrapper.find(selectors.notificationMessage)
      expect(messageEl.findAll('strong').map((el) => el.text())).toEqual([
        '{resource}',
        'someFile.txt'
      ])
    })
    it('escapes the rich message', async () => {
      const notification = mock<Notification>({
        messageRich: '{user} shared <img src=x onerror=alert(1)> with you',
        messageRichParameters: { user: { displayname: 'mary' } },
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const messageEl = wrapper.find(selectors.notificationMessage)
      expect(messageEl.find('img').exists()).toBeFalsy()
      expect(messageEl.text()).toEqual('mary shared <img src=x onerror=alert(1)> with you')
    })
    it('escapes the inserted values', async () => {
      const resourceName = '<img src=x onerror=alert(1)>.txt'
      const notification = mock<Notification>({
        messageRich: '{user} shared {resource} with you',
        messageRichParameters: {
          user: { displayname: 'mary' },
          resource: { name: resourceName }
        },
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const messageEl = wrapper.find(selectors.notificationMessage)
      expect(messageEl.find('img').exists()).toBeFalsy()
      expect(messageEl.findAll('strong').map((el) => el.text())).toEqual(['mary', resourceName])
    })
    it('interpolates repeated placeholders and keeps unknown ones', async () => {
      const notification = mock<Notification>({
        messageRich: '{user} and {user} {constructor}',
        messageRichParameters: { user: { displayname: 'mary' } },
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const messageEl = wrapper.find(selectors.notificationMessage)
      expect(messageEl.text()).toEqual('mary and mary {constructor}')
    })
    it('escapes the simple message if a rich parameter is missing', async () => {
      const notification = mock<Notification>({
        message: 'mary shared <img src=x onerror=alert(1)>.txt with you',
        messageRich: '{user} shared {resource} with you',
        // explicitly null, the deep mock would provide a missing parameter otherwise
        messageRichParameters: { user: { displayname: 'mary' }, resource: null },
        computedMessage: undefined
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const messageEl = wrapper.find(selectors.notificationMessage)
      expect(messageEl.find('img').exists()).toBeFalsy()
      expect(messageEl.text()).toEqual(notification.message)
    })
  })
  describe('link', () => {
    it('displays if given directly', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        computedMessage: undefined,
        link: 'http://some-link.com'
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      expect(wrapper.find(selectors.notificationLink).exists()).toBeTruthy()
      expect(wrapper.find(`${selectors.notificationLink} a`).attributes('title')).toBe(
        'http://some-link.com'
      )
    })
    it('does not trigger the item navigation when clicked', async () => {
      const notification = mock<Notification>({
        messageRich: undefined,
        computedMessage: undefined,
        object_type: 'share',
        messageRichParameters: { share: { id: '1' } },
        link: 'http://some-link.com'
      })
      const { wrapper } = getWrapper({ notifications: [notification] })
      await flushPromises()
      const navigate = vi.fn()
      wrapper
        .find(`${selectors.notificationItem} router-link-stub`)
        .element.addEventListener('click', navigate)
      const link = wrapper.find(`${selectors.notificationLink} a`)
      // happy-dom would otherwise load the link
      link.element.addEventListener('click', (event) => event.preventDefault())
      await link.trigger('click')
      expect(navigate).not.toHaveBeenCalled()
    })
    describe('if given via messageRichParameters', () => {
      it('renders notification as link for shares', async () => {
        const notification = mock<Notification>({
          messageRich: '{user} shared {resource} with you',
          object_type: 'share',
          messageRichParameters: {
            user: { displayname: 'Albert Einstein' },
            resource: { id: 'storage$space!item', name: 'someFile.txt' },
            share: { id: '1' }
          },
          computedMessage: undefined
        })
        const { wrapper } = getWrapper({ notifications: [notification] })
        await flushPromises()

        const routerLink = wrapper.findComponent<typeof RouterLink>(
          `${selectors.notificationItem} router-link-stub`
        )
        expect((routerLink.props('to') as RouteLocationNamedRaw).name).toEqual(
          'files-shares-with-me'
        )
        expect((routerLink.props('to') as RouteLocationNamedRaw).query).toEqual({
          scrollTo: notification.messageRichParameters.resource.id
        })
      })
      it('renders notification as link for spaces', async () => {
        const spaceMock = mock<SpaceResource>({
          fileId: '1',
          getDriveAliasAndItem: () => 'driveAlias',
          disabled: false
        })
        const notification = mock<Notification>({
          messageRich: '{user} added you to space {space}',
          object_type: 'storagespace',
          messageRichParameters: {
            user: { displayname: 'Albert Einstein' },
            space: { name: 'someFile.txt', id: `${spaceMock.fileId}!2` }
          },
          computedMessage: undefined
        })
        const { wrapper } = getWrapper({ notifications: [notification], spaces: [spaceMock] })
        await flushPromises()
        const routerLink = wrapper.findComponent<typeof RouterLink>(
          `${selectors.notificationItem} router-link-stub`
        )
        expect((routerLink.props('to') as RouteLocationNormalizedLoaded).params).toEqual({
          driveAliasAndItem: 'driveAlias'
        })
      })
      it('renders notification as link once the space is added to the store later', async () => {
        const spaceMock = mock<SpaceResource>({
          fileId: '1',
          getDriveAliasAndItem: () => 'driveAlias',
          disabled: false
        })
        const notification = mock<Notification>({
          messageRich: '{user} added you to space {space}',
          object_type: 'storagespace',
          messageRichParameters: {
            user: { displayname: 'Albert Einstein' },
            space: { name: 'someFile.txt', id: `${spaceMock.fileId}!2` }
          },
          computedMessage: undefined
        })
        const { wrapper } = getWrapper({ notifications: [notification] })
        await flushPromises()
        expect(wrapper.find(`${selectors.notificationItem} router-link-stub`).exists()).toBeFalsy()

        const spacesStore = useSpacesStore()
        spacesStore.spaces.push(spaceMock)
        await flushPromises()
        const routerLink = wrapper.findComponent<typeof RouterLink>(
          `${selectors.notificationItem} router-link-stub`
        )
        expect((routerLink.props('to') as RouteLocationNormalizedLoaded).params).toEqual({
          driveAliasAndItem: 'driveAlias'
        })
      })
    })
  })
})

function getNotification(notification: Partial<Notification>) {
  return {
    messageRich: undefined,
    messageRichParameters: undefined,
    subject: 'subject',
    datetime: '2026-01-01T00:00:00Z',
    ...notification
  } as Notification
}

function mockFetchResponse(
  mocks: ReturnType<typeof defaultComponentMocks>,
  notifications: Notification[]
) {
  mocks.$clientService.httpAuthenticated.get.mockResolvedValue(
    mock<AxiosResponse>({ data: { ocs: { data: notifications } }, headers: {} })
  )
}

const hideDropMock = vi.fn()
const OcDropStub = defineComponent({
  name: 'OcDrop',
  setup(_, { expose }) {
    expose({ hide: hideDropMock })
  },
  template: '<div><slot /></div>'
})

function getWrapper({
  mocks = {},
  notifications = [],
  spaces = [],
  supportSSE = false
}: {
  mocks?: Record<string, unknown>
  notifications?: Notification[]
  spaces?: SpaceResource[]
  supportSSE?: boolean
} = {}) {
  hideDropMock.mockReset()
  const localMocks = { ...defaultComponentMocks(), ...mocks }
  mockFetchResponse(localMocks, notifications)

  return {
    mocks: localMocks,
    wrapper: shallowMount(Notifications, {
      global: {
        renderStubDefaultSlot: true,
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              spacesState: { spaces },
              capabilityState: { capabilities: { core: { 'support-sse': supportSSE } as any } }
            }
          })
        ],
        mocks: localMocks,
        provide: localMocks,
        stubs: { 'user-avatar': true, OcButton: false, OcDrop: OcDropStub }
      }
    })
  }
}
