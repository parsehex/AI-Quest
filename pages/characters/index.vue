<script setup lang="ts">
import CharacterCard from '~/components/characters/CharacterCard.vue';

const { characters, fetchCharacters, createCharacter, deleteCharacter } = useCharacters();
const user = useSupabaseUser();
const toast = useToast();

onMounted(() => {
	fetchCharacters();
});

const handleCreate = async () => {
	const newChar = await createCharacter({
		nickname: 'New Character',
		class: 'Warrior',
		race: 'Human',
		background: 'Noble',
		traits: [],
		skills: [],
		equipment: []
	});

	if (newChar) {
		navigateTo(`/characters/${newChar.id}`);
	} else {
		toast.add({ title: 'Error', description: 'Failed to create character', color: 'red' });
	}
};

const handleDelete = async (id: string) => {
	if (confirm('Are you sure you want to delete this character?')) {
		const success = await deleteCharacter(id);
		if (success) {
			toast.add({ title: 'Success', description: 'Character deleted' });
		} else {
			toast.add({ title: 'Error', description: 'Failed to delete character', color: 'red' });
		}
	}
};
</script>
<template>
	<div class="container mx-auto p-4 max-w-4xl">
		<header class="flex justify-between items-center mb-6">
			<h1 class="text-2xl font-bold">My Characters</h1>
			<UButton icon="i-heroicons-plus" @click="handleCreate">Create New</UButton>
		</header>
		<div v-if="characters.length === 0" class="text-center py-12 text-gray-500">
			<p>You haven't created any characters yet.</p>
			<UButton class="mt-4" variant="soft" @click="handleCreate">Create your first character</UButton>
		</div>
		<div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<CharacterCard v-for="char in characters" :key="char.id" :character="char as any" mode="view">
				<template #actions>
					<UButton icon="i-heroicons-pencil" variant="ghost" size="xs" :to="`/characters/${char.id}`" />
					<UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click.stop="handleDelete(char.id)" />
				</template>
			</CharacterCard>
		</div>
	</div>
</template>
