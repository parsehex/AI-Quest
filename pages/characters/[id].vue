<script setup lang="ts">
import CharacterCard from '~/components/characters/CharacterCard.vue';
import type { Tables } from '~/types/database.types';

const route = useRoute();
const router = useRouter();
const { characters, updateCharacter, fetchCharacters } = useCharacters();
const toast = useToast();

const characterId = route.params.id as string;
const character = computed(() => characters.value.find(c => c.id === characterId));

// Ensure characters are loaded
onMounted(async () => {
	if (characters.value.length === 0) {
		await fetchCharacters();
	}
	if (!character.value) {
		toast.add({ title: 'Error', description: 'Character not found', color: 'red' });
		router.push('/characters');
	}
});

const handleUpdate = async (updatedChar: Partial<Tables<'player_characters'>>) => {
	if (!character.value) return;

	// Only send allowed fields
	const updates = {
		nickname: updatedChar.nickname,
		class: updatedChar.class,
		race: updatedChar.race,
		background: updatedChar.background,
		// Add other fields as needed
	};

	const result = await updateCharacter(characterId, updates);
	if (result) {
		toast.add({ title: 'Saved', description: 'Character updated successfully' });
	} else {
		toast.add({ title: 'Error', description: 'Failed to save changes', color: 'red' });
	}
};
</script>
<template>
	<div class="container mx-auto p-4 max-w-2xl">
		<div class="mb-4">
			<UButton icon="i-heroicons-arrow-left" variant="ghost" to="/characters">Back to Characters</UButton>
		</div>
		<h1 class="text-2xl font-bold mb-6">Edit Character</h1>
		<CharacterCard v-if="character" :character="character as any" mode="edit" @update:character="handleUpdate" />
		<div v-else class="flex justify-center py-12">
			<USkeleton class="h-64 w-full" />
		</div>
	</div>
</template>
