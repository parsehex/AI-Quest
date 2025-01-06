import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null;

export const getServiceClient = () => {
	if (!supabaseClient) {
		const config = useRuntimeConfig()

		supabaseClient = createClient(
			config.public.supabaseUrl,
			config.private.supabaseServiceKey,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false
				}
			}
		)
	}

	return supabaseClient;
}
