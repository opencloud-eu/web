<template>
  <button
    class="skip-button bg-role-secondary text-role-on-secondary py-1 px-2 focus:border-dashed focus:border-white focus:outline-0"
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

<style scoped>
.skip-button {
  position: absolute;
  top: -100px;
  left: 0;
  z-index: 6;
  -webkit-appearance: none;
}

.skip-button:focus {
  top: 0;
}
</style>
