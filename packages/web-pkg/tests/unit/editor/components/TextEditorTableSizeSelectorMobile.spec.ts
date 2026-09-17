import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { OcRange } from '@opencloud-eu/design-system/components'
import TextEditorTableSizeSelectorMobile from '../../../../src/editor/components/TextEditorTableSizeSelectorMobile.vue'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (value: string) => value })
}))

const selectors = {
  previewCells: '.table-size-selector-preview-grid > span',
  selectedPreviewCells: '.table-size-selector-preview-grid > .border-role-primary',
  sliders: 'input[type="range"]',
  insertButton: '[data-testid="insert-table-button"]'
}

describe('TextEditorTableSizeSelectorMobile', () => {
  function mountSelector() {
    return mount(TextEditorTableSizeSelectorMobile, {
      props: {
        maxRows: 9,
        maxCols: 9
      },
      global: {
        components: { OcRange },
        stubs: {
          'oc-button': defineComponent({
            inheritAttrs: false,
            template: '<button v-bind="$attrs"><slot /></button>'
          }),
          'oc-icon': true
        }
      }
    })
  }

  async function selectSize(wrapper: ReturnType<typeof mountSelector>, rows: number, cols: number) {
    const [rowsSlider, colsSlider] = wrapper.findAll(selectors.sliders)
    await rowsSlider.setValue(rows)
    await colsSlider.setValue(cols)
  }

  it('renders a slider per dimension and a preview of the full grid', () => {
    const wrapper = mountSelector()

    expect(wrapper.findAll(selectors.sliders)).toHaveLength(2)
    expect(wrapper.text()).toContain('Rows')
    expect(wrapper.text()).toContain('Columns')
    expect(wrapper.findAll(selectors.previewCells)).toHaveLength(81)
  })

  it('defaults to a 3x3 table', () => {
    const wrapper = mountSelector()

    expect(wrapper.text()).toContain('3 × 3')
    expect(wrapper.findAll(selectors.selectedPreviewCells)).toHaveLength(9)
  })

  it('updates the preview when the sliders change', async () => {
    const wrapper = mountSelector()

    await selectSize(wrapper, 4, 5)

    expect(wrapper.text()).toContain('4 × 5')
    expect(wrapper.findAll(selectors.selectedPreviewCells)).toHaveLength(20)
  })

  it('emits the selected size when the insert button is clicked', async () => {
    const wrapper = mountSelector()

    await selectSize(wrapper, 4, 5)
    await wrapper.find(selectors.insertButton).trigger('click')

    expect(wrapper.emitted('insertTable')[0]).toEqual([4, 5])
  })
})
