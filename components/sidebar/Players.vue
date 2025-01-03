<script setup lang="ts">
const log = useLog('components/sidebar/RoomDetails')
const route = useRoute()
const roomId = route.params.id as string
const sock = useGameSocket()
const room = computed(() => sock.thisRoom.value)
const players = computed(() => room.value?.players || [])
const currentTurnPlayer = computed(() => room.value?.players.find(p => p.id === room.value?.currentPlayer))
const premise = computed(() => room.value?.premise)
</script>
<template>
	<div class="p-4 border dark:border-neutral-700">
		<ul class="flex gap-4">
			<li v-for="(player, index) in sock.thisRoom.value?.players" :key="index"
				:class="'flex items-center gap-2' + (player.id === sock.thisRoom.value?.currentPlayer ? ' text-primary-500' : '')">
				<UAvatar :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`" :alt="player.nickname"
					size="sm" />
				<span class="text-sm">{{ player.nickname }}</span>
			</li>
		</ul>
	</div>
</template>
