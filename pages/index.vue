<script setup lang="ts">
import GamesList from '~/components/home/GamesList.vue';
import CreateCharacter from '~/components/home/CreateCharacter.vue';
import CreateGame from '~/components/home/CreateGame.vue';

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
    <div class="flex flex-col lg:flex-row max-w-6xl mx-auto px-4 py-6 gap-4">
      <GamesList />
      <section class="bg-gray-800 rounded-lg p-6 order-first lg:order-none">
        <CreateCharacter />
      </section>
      <CreateGame />
    </div>
  </div>
</template>
