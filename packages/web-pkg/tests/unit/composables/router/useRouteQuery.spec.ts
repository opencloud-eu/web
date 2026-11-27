import { useRouteQuery } from '../../../../src/composables'
import { Ref, nextTick, computed, ComputedRef, unref } from 'vue'
import { getComposableWrapper, createRouter } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'

describe('useRouteQuery', () => {
  it('is reactive', async () => {
    const router = createRouter({
      routes: [{ path: '/', redirect: null }]
    })
    router.push('/')
    await router.isReady()

    let fooQuery: Ref
    let fooValue: ComputedRef

    const mocks = { $router: router }
    const wrapper = getComposableWrapper(
      () => {
        fooQuery = useRouteQuery('foo', '1')
        fooValue = computed(() => parseInt(fooQuery.value as string, 10))

        return {
          fooQuery,
          fooValue
        }
      },
      {
        mocks,
        provide: mocks,
        template: `<div><div id="fooQuery">{{ fooQuery }}</div><div id="fooValue">{{ fooValue }}</div></div>`
      }
    )

    expect(wrapper.find('#fooQuery').element.innerHTML).toBe('1')
    expect(wrapper.find('#fooValue').element.innerHTML).toBe('1')
    expect(typeof fooQuery.value).toBe('string')
    expect(fooQuery.value).toBe('1')
    expect(typeof fooValue.value).toBe('number')
    expect(fooValue.value).toBe(1)

    fooQuery.value = '2'

    // FIXME: why do we have to wait for so many ticks?
    // Why don't we have to do that for any other expectation in the whole file?!
    for (let i = 0; i < 33; i++) {
      await nextTick()
    }

    expect(wrapper.find('#fooQuery').element.innerHTML).toBe('2')
    expect(wrapper.find('#fooValue').element.innerHTML).toBe('2')

    await router.push({ path: '/', query: { foo: '3' } })
    await nextTick()
    expect(wrapper.find('#fooQuery').element.innerHTML).toBe('3')
    expect(wrapper.find('#fooValue').element.innerHTML).toBe('3')

    await router.push({ path: '/', query: {} })
    await nextTick()
    expect(wrapper.find('#fooQuery').element.innerHTML).toBe('1')
    expect(wrapper.find('#fooValue').element.innerHTML).toBe('1')
  })

  it('has a default value if route query is not set', async () => {
    const router = createRouter()

    const mocks = { $router: router }
    let fooQuery: Ref
    getComposableWrapper(
      () => {
        fooQuery = useRouteQuery('foo', 'defaultValue')
      },
      { mocks, provide: mocks }
    )

    expect(fooQuery.value).toBe('defaultValue')

    await router.push({ path: '/', query: { foo: 'foo-1' } })
    expect(fooQuery.value).toBe('foo-1')

    await router.push({ path: '/' })
    expect(fooQuery.value).toBe('defaultValue')
  })

  it('should update on route query change', async () => {
    const router = createRouter()

    const mocks = { $router: router }
    let fooQuery: Ref
    let barQuery: Ref
    getComposableWrapper(
      () => {
        fooQuery = useRouteQuery('foo')
        barQuery = useRouteQuery('bar')
      },
      { mocks, provide: mocks }
    )

    await router.push({ path: '/', query: { foo: 'foo-1' } })
    expect(fooQuery.value).toBe('foo-1')
    expect(barQuery.value).toBeFalsy()

    await router.push({ path: '/', query: { foo: 'foo-2' } })
    expect(fooQuery.value).toBe('foo-2')
    expect(barQuery.value).toBeFalsy()

    await router.push({ path: '/', query: { foo: 'foo-3', bar: 'bar-1' } })
    expect(fooQuery.value).toBe('foo-3')
    expect(barQuery.value).toBe('bar-1')
  })

  it('should be undefined if route changes and query is not present', async () => {
    const router = createRouter()

    const mocks = { $router: router }
    let fooQuery: Ref
    getComposableWrapper(
      () => {
        fooQuery = useRouteQuery('foo')
      },
      { mocks, provide: mocks }
    )

    await router.push({ path: '/home', query: { foo: 'bar' } })
    expect(fooQuery.value).toBe('bar')

    await router.push({ path: '/sub' })
    expect(fooQuery.value).toBeUndefined()
  })

  it('should update route query', async () => {
    const router = createRouter()

    const mocks = { $router: router }
    let fooQuery: Ref
    getComposableWrapper(
      () => {
        fooQuery = useRouteQuery('foo')
      },
      { mocks, provide: mocks }
    )

    await router.push({ path: '/home' })
    expect(fooQuery.value).toBeUndefined()

    fooQuery.value = 'changedThroughRef'
    await flushPromises()
    expect(unref(router.currentRoute).query.foo).toBe('changedThroughRef')
  })
})
