import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";
import type { NitroApp } from 'nitropack/types';
import { useLog } from '~/composables/useLog';
import { registerAdminHandlers } from '../game/handlers/admin';
import { registerChatHandlers } from '../game/handlers/chat';
import { registerChoiceHandlers } from '../game/handlers/choices';
import { registerRoomHandlers } from '../game/handlers/room';
import { registerClientHandlers } from '../game/handlers/client';
import { useServerOptions } from '../game/ServerOptionsManager';

const log = useLog('server/plugins/socket.io');

let ioInstance: Server | null = null;

export const useIO = () => {
	if (!ioInstance) throw new Error('Socket.IO instance not initialized');
	return ioInstance;
};


export default defineNitroPlugin(async (nitroApp: NitroApp) => {
	const engine = new Engine();
	const io = new Server();
	const serverOptions = useServerOptions();

	ioInstance = io;

	io.bind(engine);

	io.on('connection', (socket) => {
		const SocketId = socket.id;
		log.debug({ _ctx: { SocketId } }, 'Socket connected');

		// Register handlers
		registerAdminHandlers(socket);
		registerClientHandlers(socket);
		if (!serverOptions.isGameActive()) {
			return;
		}

		registerChatHandlers(socket);
		registerChoiceHandlers(socket);
		registerRoomHandlers(socket);
	});

	nitroApp.router.use('/socket.io/', defineEventHandler({
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
