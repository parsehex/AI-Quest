import { useServerOptions } from '~/server/game/ServerOptionsManager';
import { useLog } from '~/composables/useLog';

const log = useLog('api/admin/model-config');

export default defineEventHandler(async (event) => {
	try {
		const serverOptions = useServerOptions();
		const config = serverOptions.getModelConfig();

		setResponseHeader(event, 'Content-Type', 'application/json');
		return config;
	} catch (error: any) {
		log.error({ error: error.message }, 'Failed to get model config');
		throw createError({
			statusCode: 500,
			message: 'Failed to get model configuration'
		});
	}
});
