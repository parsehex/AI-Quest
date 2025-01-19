<script setup lang="ts">
const createCharacter = useCreateCharacter();
</script>
<template>
  <div class="inline-flex items-center gap-2">
    <UButton type="button" icon="i-heroicons-arrow-path-16-solid" variant="ghost" size="xs"
      @click="createCharacter.shuffleName" class="ml-2"> Shuffle </UButton>
    <UTooltip text="You can only use preset names in the demo" :open-delay="500">
      <UInput :value="createCharacter.nameInput.value" disabled placeholder="Enter character name" :ui="{
        width: 'w-48',
        input: 'text-sm muted',
        base: `rounded-md border-0 shadow-sm ring-1`,
      }" />
    </UTooltip>
  </div>
</template>
