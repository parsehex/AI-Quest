<script setup lang="ts">
import { onMounted, ref } from 'vue';

const nickname = ref('');

onMounted(() => {
  nickname.value = localStorage.getItem('nickname') || '';
});

const updateNickname = () => {
  if (nickname.value.trim()) {
    localStorage.setItem('nickname', nickname.value);
  }
}
</script>
<template>
  <div class="flex items-center gap-2 px-4">
    <UInput v-model="nickname" placeholder="Enter nickname" @change="updateNickname" :ui="{
      width: 'w-48',
      input: 'text-sm'
    }" />
  </div>
</template>
