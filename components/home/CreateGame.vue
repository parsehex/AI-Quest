<script setup lang="ts">
import { STARTER_PREMISES } from '~/lib/constants';

const { createRoom, refreshStarterPremise, premiseInput, remixPremise } = useCreateGame()
</script>
<template>
	<BaseCard title="Create a Game" icon="i-heroicons-plus-circle">
		<form @submit.prevent="createRoom" class="space-y-4">
			<div>
				<span class="block text-sm font-medium mb-2"> Game Premise <UButton type="button"
						icon="i-heroicons-arrow-path-16-solid" variant="ghost" size="xs" @click="refreshStarterPremise"
						class="ml-2"> Shuffle </UButton>
					<!-- <UButton type="button" icon="i-heroicons-sparkles" variant="ghost" size="xs" @click="remixPremise"
						class="ml-2" /> -->
				</span>
				<!-- <UTextarea v-model="premiseInput" placeholder="Describe your game scenario..." :rows="3" class="w-full" /> -->
				<USelect v-model="premiseInput" :options="STARTER_PREMISES" />
			</div>
			<UButton type="submit" icon="i-heroicons-plus" class="w-full" :disabled="!premiseInput"> Create Game </UButton>
		</form>
	</BaseCard>
</template>
