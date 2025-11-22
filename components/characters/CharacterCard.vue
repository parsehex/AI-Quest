<script setup lang="ts">
import type { PlayerCharacter } from '~/types/Game';
import type { Tables } from '~/types/database.types';
import NicknameInput from '~/components/NicknameInput.vue';

const props = defineProps<{
	character?: PlayerCharacter | Tables<'player_characters'> | null;
	mode?: 'create' | 'edit' | 'view';
}>();

const emit = defineEmits(['update:character']);

const isExpanded = ref(props.mode === 'create' || props.mode === 'edit');

// Initialize with defaults or provided character
const localCharacter = ref<Partial<PlayerCharacter> & { nickname?: string }>({
	nickname: '',
	class: 'Warrior',
	race: 'Human',
	background: 'Noble',
	traits: [],
	skills: [],
	equipment: [],
});

const characterOptions = {
	classes: ['', 'Warrior', 'Mage', 'Rogue', 'Cleric', 'Ranger'],
	races: ['', 'Human', 'Elf', 'Dwarf', 'Halfling', 'Orc'],
	backgrounds: ['', 'Noble', 'Merchant', 'Criminal', 'Soldier', 'Scholar']
};

// Track initial state for change detection
const initialCharacterState = ref<string>('');

watch(() => props.character, (newVal) => {
	if (newVal) {
		const charState = {
			nickname: newVal.nickname || '',
			class: newVal.class || 'Warrior',
			race: newVal.race || 'Human',
			background: newVal.background || 'Noble',
			traits: newVal.traits || [],
			skills: newVal.skills || [],
			equipment: newVal.equipment || [],
		};
		localCharacter.value = { ...charState };
		initialCharacterState.value = JSON.stringify(charState);
	} else {
		// Defaults
		const defaults = {
			nickname: '',
			class: 'Warrior',
			race: 'Human',
			background: 'Noble',
			traits: [],
			skills: [],
			equipment: [],
		};
		localCharacter.value = { ...defaults };
		initialCharacterState.value = JSON.stringify(defaults);
	}
}, { deep: true, immediate: true });

const hasChanges = computed(() => {
	return JSON.stringify(localCharacter.value) !== initialCharacterState.value;
});

const saveCharacter = () => {
	emit('update:character', localCharacter.value);
	// Update initial state to current state to reset hasChanges
	initialCharacterState.value = JSON.stringify(localCharacter.value);
};

const displayName = computed(() => localCharacter.value.nickname || 'Anonymous');
const isReadOnly = computed(() => props.mode === 'view');

const updateDisplayName = (name: string) => {
	localCharacter.value.nickname = name;
};
</script>
<template>
	<UCard :ui="{ header: { padding: 'p-0' }, body: { padding: !isExpanded ? 'p-0' : undefined } }"
		:class="'character-card' + (isExpanded ? ' expanded' : '')">
		<template #header>
			<div class="flex items-center justify-between cursor-pointer select-none px-4 py-3 sm:px-6"
				@click="isExpanded = !isExpanded">
				<div class="flex items-center gap-3">
					<UAvatar :alt="displayName" size="sm" />
					<div>
						<span class="block text-xs text-gray-500 dark:text-gray-400">Character</span>
						<span class="font-medium">{{ displayName }}</span>
						<span v-if="localCharacter.race" class="text-sm text-gray-500 dark:text-gray-400 ml-1">the {{
							localCharacter.race }}</span>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<slot name="actions" />
					<UButton icon="i-heroicons-chevron-down" variant="ghost" :class="{ 'rotate-180': isExpanded }" />
				</div>
			</div>
		</template>
		<template v-if="isExpanded" #default>
			<div class="space-y-4 flex flex-col justify-center p-4">
				<div class="form-group">
					<label class="block text-sm font-medium mb-1">Name</label>
					<NicknameInput v-if="!isReadOnly" @update:name="updateDisplayName" :initial-value="localCharacter.nickname" />
					<p v-else class="text-gray-900 dark:text-white">{{ displayName }}</p>
				</div>
				<div v-if="!isReadOnly || localCharacter.race" class="form-group">
					<label class="block text-sm font-medium mb-1">Race</label>
					<USelect v-model="localCharacter.race" :options="characterOptions.races" :disabled="isReadOnly" />
				</div>
				<div v-if="!isReadOnly || localCharacter.class" class="form-group">
					<label class="block text-sm font-medium mb-1">Class</label>
					<USelect v-model="localCharacter.class" :options="characterOptions.classes" :disabled="isReadOnly" />
				</div>
				<div v-if="!isReadOnly || localCharacter.background" class="form-group">
					<label class="block text-sm font-medium mb-1">Background</label>
					<USelect v-model="localCharacter.background" :options="characterOptions.backgrounds" :disabled="isReadOnly" />
				</div>
			</div>
			<div v-if="!isReadOnly" class="px-4 pb-4 flex justify-end">
				<UButton :disabled="!hasChanges" @click="saveCharacter" color="primary" icon="i-heroicons-check"> Save Changes
				</UButton>
			</div>
		</template>
	</UCard>
</template>
<style scoped lang="scss">
.form-group {
	@apply flex gap-2 items-center justify-between;

	&> :first-child {
		@apply mr-8;
	}
}
</style>
