import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";
import type { NitroApp } from 'nitropack/types';
import { useLog } from '~/composables/useLog';
import { GameRoomManager } from '../game/GameRoomManager';
import { registerAdminHandlers } from '../game/handlers/admin';
import { registerChatHandlers } from '../game/handlers/chat';
import { registerChoiceHandlers } from '../game/handlers/choices';
import { registerRoomHandlers } from '../game/handlers/rooms';

const log = useLog('server/plugins/socket.io');

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
	const engine = new Engine();
	const io = new Server();
	const roomManager = new GameRoomManager(io);

	io.bind(engine);

	io.on("connection", (socket) => {
		const SocketId = socket.id;
		log.debug({ _context: { SocketId } }, "A user connected");

		// Register all handlers
		registerAdminHandlers(io, socket, roomManager);
		registerChatHandlers(io, socket, roomManager);
		registerChoiceHandlers(io, socket, roomManager);
		registerRoomHandlers(io, socket, roomManager);
	});

	nitroApp.router.use("/socket.io/", defineEventHandler({
		handler(event) {
			// @ts-expect-error
			engine.handleRequest(event.node.req, event.node.res);
			event._handled = true;
		},
		websocket: {
			open(peer) {
				// @ts-expect-error private method and property
				engine.prepare(peer._internal.nodeReq);
				// @ts-expect-error private method and property
				engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket);
			}
		}
	}));
});
