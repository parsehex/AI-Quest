<script lang="ts" setup>
import RoomManager from '~/components/home/RoomManager.vue';

definePageMeta({
  title: "Home",
  name: "Home",
  path: "/",
  description: "Home page",
  keywords: "Home",
});
</script>
<template>
  <div class="relative h-full flex flex-col items-center gap-4 mx-auto max-w-7xl">
    <RoomManager />
  </div>
</template>
