<script setup lang="ts">
const { fastMode, createRoom, refreshStarterPremise, premiseInput, remixPremise } = useCreateGame()
</script>
<template>
	<section class="bg-gray-800 rounded-lg p-6 transition-all duration-300">
		<h2 class="text-2xl font-bold mb-6 flex items-center">
			<i class="i-heroicons-plus-circle mr-2" /> Create a Game
		</h2>
		<form @submit.prevent="createRoom" class="space-y-4">
			<div>
				<span class="block text-sm font-medium mb-2"> Game Premise
					<UButton type="button" icon="i-heroicons-arrow-path-16-solid" variant="ghost" size="xs"
						@click="refreshStarterPremise" class="ml-2" />
					<UButton type="button" icon="i-heroicons-sparkles" variant="ghost" size="xs" @click="remixPremise"
						class="ml-2" />
				</span>
				<UTextarea v-model="premiseInput" placeholder="Describe your game scenario..." :rows="3" class="w-full" />
			</div>
			<div class="flex items-center gap-4">
				<UTooltip text="Fast Mode - Faster but lower quality">
					<div class="flex items-center gap-2">
						<label for="fastMode" class="text-sm font-medium"> Fast Mode <i
								class="i-heroicons-clock inline-block w-4 h-4" />
						</label>
						<UToggle id="fastMode" v-model="fastMode" />
					</div>
				</UTooltip>
			</div>
			<UButton type="submit" icon="i-heroicons-plus" class="w-full"> Create Game </UButton>
		</form>
	</section>
</template>
