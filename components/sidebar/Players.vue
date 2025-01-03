<script setup lang="ts">
const log = useLog('components/sidebar/RoomDetails')
const sock = useGameSocket()
const room = computed(() => sock.thisRoom.value)
const players = computed(() => room.value?.players || [])
const currentTurnPlayer = computed(() => room.value?.players.find(p => p.id === room.value?.currentPlayer))
</script>
<template>
	<div class="p-4 border dark:border-neutral-700">
		<CreateCharacter :read-only="true" />
		<ul class="mt-4 flex gap-4">
			<li v-for="(player, index) in players" :key="index"
				:class="'flex items-center gap-2' + (player.id === currentTurnPlayer?.id ? ' text-primary-500' : '')">
				<UAvatar :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`" :alt="player.nickname"
					size="sm" />
				<span class="text-sm">{{ player.nickname }}</span>
			</li>
		</ul>
	</div>
</template>
