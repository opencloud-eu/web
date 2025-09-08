# Color palette

The design system provides some colors that can be used globally. Currently they are primarily suited for icons.

## Available colors

<script setup lang="ts">
import { computed, ref, onMounted, unref } from 'vue'
import { useLoadCssDefaultVars } from '../.vitepress/composables/useLoadCssDefaultVars'

const { isLoading, cssVars } = useLoadCssDefaultVars()

const tokens = computed(() => {
	return Object.values(unref(cssVars)).filter(({ name }) => name.startsWith('oc-color-'))
})

const fields = [
   {
    name: 'color',
    title: 'Color',
    type: 'slot'
  },
  {
    name: 'name',
    title: 'Name',
    type: 'slot'
  },
  {
    name: 'value',
    title: 'Value',
    type: 'slot'
  },
]
</script>

<oc-table :fields="fields" :data="tokens">
  <template #color="{ item }">
    <div :style="{ backgroundColor: item.value, width: '150px', height: '50px' }" />
  </template>
  <template #name="{ item }">
    {{ item.name }}
  </template>
  <template #value="{ item }">
    {{ item.value }}
  </template>
</oc-table>

<style lang="scss">
.oc-tbody-tr {
  background-color: var(--oc-role-surface) !important;
}
</style>

## Usage

You can use these variables in your SCSS files or style blocks:

```scss
.element {
  color: var(--oc-role-icon-folder);
}
```
