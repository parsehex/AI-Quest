<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

const nickname = ref('');
const isValid = ref(false);

const emit = defineEmits(['update:name']);

const validateName = (name: string) => {
  return name.trim().length >= 3;
};

watch(nickname, (newValue) => {
  isValid.value = validateName(newValue);
  if (isValid.value) {
    emit('update:name', newValue);
  }
});

const updateNickname = () => {
  if (isValid.value) {
    localStorage.setItem('nickname', nickname.value);
    emit('update:name', nickname.value);
  }
}

const props = defineProps<{
  initialValue?: string
}>()

onMounted(() => {
  const savedName = props.initialValue || localStorage.getItem('nickname') || '';
  nickname.value = savedName;
  if (validateName(savedName)) {
    emit('update:name', savedName);
  }
});
</script>
<template>
  <div class="inline-flex items-center gap-2">
    <UInput v-model="nickname" placeholder="Enter character name" @change="updateNickname"
      :icon="nickname && isValid ? 'i-heroicons-check-circle' : ''" :color="nickname && isValid ? 'green' : 'gray'" :ui="{
        input: 'text-sm',
        base: `rounded-md border-0 shadow-sm ring-1 ${nickname && !isValid ? 'ring-red-500' : 'ring-gray-300'
          }`
      }" />
  </div>
</template>
