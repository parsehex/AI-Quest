<script setup>
const route = useRoute();
const gameStatus = useGameStatus();

const isAdminRoute = computed(() => route.path.startsWith('/admin'));

onMounted(async () => {
  gameStatus.refreshGameActive();
});
</script>
<template>
  <div class="flex flex-col h-screen">
    <LayoutNavbar />
    <div class="flex-1">
      <div v-if="!gameStatus.isActive.value && !isAdminRoute" class="text-center p-4">
        <h2 class="text-xl text-red-500 mb-2">Game is currently inactive</h2>
        <p class="text-muted">Please try again later</p>
      </div>
      <slot v-else />
    </div>
    <!-- <LayoutFooter /> -->
  </div>
</template>
