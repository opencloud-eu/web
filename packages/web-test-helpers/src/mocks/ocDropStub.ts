// can be used to stub oc-drop in tests
export const ocDropStub = {
  name: 'OcDropStub',
  template: '<div><slot /></div>',
  methods: {
    hide: vi.fn(),
    show: vi.fn()
  }
}
