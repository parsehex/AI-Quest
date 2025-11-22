import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { roomId } = body
  const user = await serverSupabaseUser(event)
  const client = await serverSupabaseClient<Database>(event)

  if (!user || !roomId) {
    return { success: false }
  }

  const { error } = await client
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error leaving room:', error)
    return { success: false, error }
  }

  return { success: true }
})
