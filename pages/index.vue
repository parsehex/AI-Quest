<script setup lang="ts">
import GamesList from '~/components/home/GamesList.vue'
import CreateCharacter from '~/components/home/CreateCharacter.vue'
import CreateGame from '~/components/home/CreateGame.vue'

definePageMeta({
  title: "Home",
  name: "Home",
  path: "/",
  description: "Home page",
  keywords: "Home",
});
</script>
<template>
  <div class="container mx-auto p-4">
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <GamesList class="md:col-span-2 lg:col-span-1" />
      <CreateCharacter />
      <CreateGame />
    </div>
  </div>
</template>
