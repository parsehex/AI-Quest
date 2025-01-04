import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
	const client = await serverSupabaseClient(event)
	// TODO use getUser
	const { data: { session } } = await client.auth.getSession()

	if (!session) {
		throw createError({
			statusCode: 401,
			message: 'No session found'
		})
	}

	const config = useRuntimeConfig()
	const discordUserId = session.user.user_metadata.provider_id
	const guildId = config.private.discordGuildId
	const botToken = config.private.discordBotToken

	if (!guildId || !botToken) {
		throw createError({
			statusCode: 500,
			message: 'Discord integration not configured'
		})
	}
	if (!discordUserId) {
		throw createError({
			statusCode: 400,
			message: 'No Discord user ID found'
		})
	}

	const memberData = await fetch(
		`https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
		{
			headers: {
				Authorization: `Bot ${botToken}`
			}
		}
	).then(res => res.json())

	return {
		discord_id: session.user.user_metadata.provider_id,
		discord_username: session.user.user_metadata.full_name,
		discord_avatar: session.user.user_metadata.avatar_url,
		roles: memberData.roles || [],
	}
})
