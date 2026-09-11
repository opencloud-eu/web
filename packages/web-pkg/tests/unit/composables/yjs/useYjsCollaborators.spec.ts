import { defineComponent, h, unref } from 'vue'
import { mount } from '@vue/test-utils'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import {
  decodeIdentityMessage,
  useYjsCollaborators
} from '../../../../src/composables/yjs/useYjsCollaborators'

/** Two awareness instances that see each other's states, like peers in a room. */
function createRoom() {
  const a = new Awareness(new Y.Doc())
  const b = new Awareness(new Y.Doc())
  return { a, b }
}

function setRemoteUser(aw: Awareness, clientId: number, user: Record<string, unknown> | null) {
  // Awareness has no public API to set foreign states, so mirror the
  // internal bookkeeping and emit the same change event a network update does.
  const meta = aw.meta.get(clientId)
  aw.meta.set(clientId, { clock: (meta?.clock ?? 0) + 1, lastUpdated: Date.now() })
  if (user === null) {
    aw.states.delete(clientId)
    aw.emit('change', [{ added: [], updated: [], removed: [clientId] }, 'test'])
    return
  }
  const isNew = !aw.states.has(clientId)
  aw.states.set(clientId, { user })
  aw.emit('change', [
    { added: isNew ? [clientId] : [], updated: isNew ? [] : [clientId], removed: [] },
    'test'
  ])
}

function mountCollaborators(awareness: Awareness | null) {
  let collaborators: ReturnType<typeof useYjsCollaborators>
  const wrapper = mount(
    defineComponent({
      setup() {
        collaborators = useYjsCollaborators(awareness)
        return () => h('div')
      }
    })
  )
  return { wrapper, collaborators: () => unref(collaborators!) }
}

describe('decodeIdentityMessage', () => {
  it('parses the server identity message', () => {
    expect(
      decodeIdentityMessage('_oc_identity:{"id":"u1","name":"Alice","color":"#123456"}')
    ).toEqual({ id: 'u1', name: 'Alice', color: '#123456' })
  })

  it('returns null for other payloads', () => {
    expect(decodeIdentityMessage('_oc_seed_granted')).toBeNull()
    expect(decodeIdentityMessage('_oc_identity:{broken')).toBeNull()
    expect(decodeIdentityMessage('_oc_identity:{"name":"no id"}')).toBeNull()
    expect(decodeIdentityMessage('_oc_identity:"string"')).toBeNull()
  })
})

describe('useYjsCollaborators', () => {
  it('is empty without an awareness', () => {
    const { collaborators } = mountCollaborators(null)
    expect(collaborators()).toEqual([])
  })

  it('ignores states without a stamped user', () => {
    const { a } = createRoom()
    a.setLocalStateField('user', {})
    const { collaborators } = mountCollaborators(a)
    expect(collaborators()).toEqual([])
  })

  it('lists the own user first and peers sorted by name', () => {
    const { a } = createRoom()
    a.setLocalStateField('user', { id: 'me', name: 'Zoe', color: '#000000' })
    setRemoteUser(a, 200, { id: 'p2', name: 'Bob', color: '#00ff00' })
    setRemoteUser(a, 300, { id: 'p1', name: 'Alice', color: '#ff0000' })
    const { collaborators } = mountCollaborators(a)

    expect(collaborators().map((u) => u.name)).toEqual(['Zoe', 'Alice', 'Bob'])
    expect(collaborators()[0]).toMatchObject({ id: 'me', isSelf: true, color: '#000000' })
    expect(collaborators()[1].isSelf).toBe(false)
  })

  it('shows a user with several clients once', () => {
    const { a } = createRoom()
    a.setLocalStateField('user', { id: 'me', name: 'Zoe', color: '#000000' })
    setRemoteUser(a, 200, { id: 'me', name: 'Zoe', color: '#000000' })
    setRemoteUser(a, 300, { id: 'p1', name: 'Alice', color: '#ff0000' })
    const { collaborators } = mountCollaborators(a)

    expect(collaborators()).toHaveLength(2)
    expect(collaborators()[0]).toMatchObject({ id: 'me', isSelf: true })
  })

  it('updates when peers join and leave', () => {
    const { a } = createRoom()
    a.setLocalStateField('user', { id: 'me', name: 'Zoe', color: '#000000' })
    const { collaborators } = mountCollaborators(a)
    expect(collaborators()).toHaveLength(1)

    setRemoteUser(a, 200, { id: 'p1', name: 'Alice', color: '#ff0000' })
    expect(collaborators()).toHaveLength(2)

    setRemoteUser(a, 200, null)
    expect(collaborators()).toHaveLength(1)
  })

  it('falls back to a default color when the state carries none', () => {
    const { a } = createRoom()
    setRemoteUser(a, 200, { id: 'p1', name: 'Alice' })
    const { collaborators } = mountCollaborators(a)
    expect(collaborators()[0].color).toBe('#ffa500')
  })

  it('keeps the same list when only a cursor moves', () => {
    const { a } = createRoom()
    a.setLocalStateField('user', { id: 'me', name: 'Zoe', color: '#000000' })
    const { collaborators } = mountCollaborators(a)
    const before = collaborators()

    a.setLocalStateField('cursor', { anchor: 1, head: 2 })
    expect(collaborators()).toBe(before)
  })

  it('detaches from the awareness on unmount', () => {
    const { a } = createRoom()
    a.setLocalStateField('user', { id: 'me', name: 'Zoe', color: '#000000' })
    const { wrapper, collaborators } = mountCollaborators(a)
    wrapper.unmount()

    setRemoteUser(a, 200, { id: 'p1', name: 'Alice', color: '#ff0000' })
    expect(collaborators()).toHaveLength(1)
  })
})
