<template>
  <button
    class="skip-button absolute left-0 top-[-100px] z-60 bg-role-secondary text-role-on-secondary py-1 px-2 focus:border-dashed focus:border-white focus:outline-0 focus:top-0 appearance-none"
    @click="skipToTarget"
  >
    <slot />
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  props: {
    /*
     * The element to focus and to skip to
     */
    target: {
      type: String,
      required: true
    }
  },
  computed: {
    targetElement() {
      return document.getElementById(this.target)
    }
  },
  methods: {
    skipToTarget() {
      this.targetElement.setAttribute('tabindex', '-1')
      this.targetElement.focus()
      this.targetElement.scrollIntoView()
    }
  }
})
</script>
