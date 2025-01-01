// server/plugins/socket.io.ts
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";
import type { NitroApp } from 'nitropack/types';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { RoomManager } from '../game/rooms';
import { registerRoomHandlers } from '../game/socket-handlers';
import { useLog } from '~/composables/useLog';

const log = useLog('server/plugins/socket.io');

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
	const dataDir = 'data/rooms';
	if (!existsSync(dataDir)) {
		await mkdir(dataDir, { recursive: true });
	}

	const engine = new Engine();
	const io = new Server();
	const roomManager = new RoomManager();

	io.bind(engine);

	io.on("connection", (socket) => {
		log.debug("A user connected", socket.id);

		// Register all handlers
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
