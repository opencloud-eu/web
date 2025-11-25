// Test script to check the ref structure
import { storeToRefs } from 'pinia'
import { ref, isRef } from 'vue'

// Simulate the store structure
const createStore = () => {
  const accounts = ref([])
  const currentAccount = ref()

  return {
    accounts,
    currentAccount
  }
}

const store = createStore()
const { accounts, currentAccount } = storeToRefs(store)

console.log('accounts is ref:', isRef(accounts))
console.log('accounts.value is ref:', isRef(accounts.value))
console.log('currentAccount is ref:', isRef(currentAccount))
console.log('currentAccount.value is ref:', isRef(currentAccount.value))
