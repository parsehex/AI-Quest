import { Server, Socket } from 'socket.io';
import type { GameRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { ChatMessage } from '~/types/Game';

const log = useLog('handlers/chat');

export const registerChatHandlers = (io: Server, socket: Socket, roomManager: GameRoomManager) => {
	socket.on('message', async ({ roomId, text }) => {
		log.debug('Socket', socket.id, 'sent message', text, 'in room', roomId);
		const nickname = socket.data.nickname || 'Anonymous';
		const message: ChatMessage = {
			sender: socket.id,
			text,
			timestamp: new Date(),
			nickname
		};
		await roomManager.addMessage(roomId, message);
		io.to(roomId).emit('newMessage', message);
	});

	socket.on("getMessages", async (roomId: string) => {
		// log.debug("Socket", socket.id, "getting messages for room", roomId);
		const messages = await roomManager.getChatHistory(roomId);
		socket.to(roomId).emit("chatHistory", messages);
	});
};
