<template>
  <h2 id="properties" tabindex="-1">
    Properties
    <a class="header-anchor" href="#properties" aria-label='Permalink to "Properties"'>​</a>
  </h2>
  <div v-if="isLoading" class="flex justify-center">
    <oc-spinner aria-label="Loading properties" />
  </div>
  <div v-else>
    <oc-table v-if="props.length" :fields="fields" :data="props" class="props-table">
      <template #type="{ item }">
        <code> {{ item.type }}</code>
      </template>
      <template #description="{ item }">
        <span v-html="item.description.replace(/`([^`]+)`/g, '<code>$1</code>')" />
        <span v-if="item.default">
          Defaults to <code>{{ item.default }}</code
          >.</span
        >
      </template>
    </oc-table>
    <div v-else>This component doesn't define properties.</div>
  </div>
  <h2 id="emits" tabindex="-1">
    Emits
    <a class="header-anchor" href="#emits" aria-label='Permalink to "Emits"'>​</a>
  </h2>
  <div v-if="isLoading" class="flex justify-center">
    <oc-spinner aria-label="Loading emits" />
  </div>
  <div v-else>
    <oc-table
      v-if="emits.length"
      :fields="fields.filter((f) => f.name !== 'required')"
      :data="emits"
      class="emits-table"
    >
      <template #type="{ item }">
        <code> {{ item.type }}</code>
      </template>
      <template #description="{ item }">
        <span v-html="item.description.replace(/`([^`]+)`/g, '<code>$1</code>')" />
      </template>
    </oc-table>
    <div v-else>This component doesn't define emits.</div>
  </div>
  <h2 id="slots" tabindex="-1">
    Slots
    <a class="header-anchor" href="#slots" aria-label='Permalink to "Slots"'>​</a>
  </h2>
  <div v-if="isLoading" class="flex justify-center">
    <oc-spinner aria-label="Loading slots" />
  </div>
  <div v-else>
    <oc-table
      v-if="slots.length"
      :fields="fields.filter((f) => f.name !== 'required')"
      :data="slots"
      class="slots-table !table"
    >
      <template #type="{ item }">
        <code> {{ item.type }}</code>
      </template>
      <template #description="{ item }">
        <span v-html="item.description.replace(/`([^`]+)`/g, '<code>$1</code>')" />
      </template>
    </oc-table>
    <div v-else>This component doesn't define slots.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, Ref, unref } from 'vue'
import { Emit, Prop, Slot } from '../generateJsonMetaData'
import { useComponentName } from '../composables/useComponentName'

const { component } = defineProps<{ component?: string }>()

const { componentName } = useComponentName()

const fields = [
  {
    name: 'name',
    title: 'Name'
  },
  {
    name: 'required',
    title: 'Required'
  },
  {
    name: 'type',
    title: 'Type',
    type: 'slot'
  },
  {
    name: 'description',
    title: 'Description',
    type: 'slot'
  }
]

const emits: Ref<Emit[]> = ref([])
const props: Ref<Prop[]> = ref([])
const slots: Ref<Slot[]> = ref([])
const isLoading = ref(true)

const load = async (type: string, componentName: string) => {
  try {
    const response = await fetch(`../${type}/${componentName}.json`)
    if (response.headers?.get('content-type')?.startsWith('application/json')) {
      return response.json()
    }
    return []
  } catch (e) {
    console.error(`loading ${type}:`, e)
  }
}

onMounted(async () => {
  emits.value = await load('emits', component || unref(componentName))
  props.value = await load('props', component || unref(componentName))
  slots.value = await load('slots', component || unref(componentName))
  isLoading.value = false
})
</script>

<style lang="scss">
.emits-table,
.props-table,
.slots-table {
  width: 100%;
  th,
  td {
    background-color: #fff;
    border: 0;
    border-bottom: 1px solid var(--vp-c-divider);
  }
  tr {
    border: 0;
  }
}
</style>
