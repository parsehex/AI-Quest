// composables/useGameSocket.ts
import type { Room } from '~/types/Game'
import { socket } from '~/components/socket'
import { ref, computed, onBeforeUnmount } from 'vue'

export function useGameSocket() {
	// Connection state
	const isConnected = ref(false)
	const transport = ref('N/A')

	// Room state
	const rooms = ref<Room[]>([])
	const currentRoom = ref(null as string | null)
	const error = ref(null)

	const hasRooms = computed(() => rooms.value.length > 0)

	// Connection handlers
	function onConnect() {
		isConnected.value = true
		transport.value = socket.io.engine.transport.name

		socket.io.engine.on("upgrade", (rawTransport) => {
			transport.value = rawTransport.name
		})

		// Request initial room list on connect
		socket.emit('getRooms')
	}

	function onDisconnect() {
		isConnected.value = false
		transport.value = 'N/A'
	}

	// Room handlers
	const createRoom = (roomName: string) => {
		socket.emit('createRoom', roomName)
	}

	const joinRoom = (roomId: string) => {
		socket.emit('joinRoom', roomId)
		currentRoom.value = roomId
	}

	const leaveRoom = () => {
		if (currentRoom.value) {
			socket.emit('leaveRoom', currentRoom.value)
			currentRoom.value = null
		}
	}

	// Socket event listeners
	socket.on('connect', onConnect)
	socket.on('disconnect', onDisconnect)

	socket.on('roomList', (updatedRooms) => {
		console.log('Room list updated', updatedRooms)
		rooms.value = [...updatedRooms]
	})

	socket.on('playerJoined', (playerId) => {
		console.log(`Player ${playerId} joined`)
		// Handle new player joining
	})

	// Initial connection check
	if (socket.connected) {
		onConnect()
	}

	// Cleanup
	onBeforeUnmount(() => {
		socket.off('connect', onConnect)
		socket.off('disconnect', onDisconnect)
		socket.off('roomList')
		socket.off('playerJoined')
	})

	return {
		// Connection state
		isConnected,
		transport,

		// Room state
		rooms,
		currentRoom,
		error,
		hasRooms,

		// Methods
		createRoom,
		joinRoom,
		leaveRoom
	}
}
