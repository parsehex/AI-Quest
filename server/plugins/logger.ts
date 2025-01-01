import { useLog } from '~/composables/useLog'

export default defineNitroPlugin(() => {
	const logger = useLog()

	return {
		provide: {
			logger
		}
	}
})
