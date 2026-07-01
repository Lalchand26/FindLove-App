import { supabase } from './supabase'

// Kisne like kiya - list + count
export const getWhoLikedMe = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error, count } = await supabase
   .from('likes')
   .select(`
      id,
      liker_id,
      created_at,
      profiles:liker_id (
        id,
        full_name,
        username,
        avatar_url,
        bio,
        age
      )
    `, { count: 'exact' })
   .eq('liked_id', user.id)
   .eq('action_type', 'like') // ✅ Sirf likes, dislike nahi
   .eq('is_match', false) // Jo abhi match nahi bane
   .order('created_at', { ascending: false })

  if (error) throw error
  
  return { 
    users: data || [], 
    totalCount: count || 0 // Total kitne logo ne like kiya
  }
}

// Total likes count sirf number
export const getTotalLikesCount = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { count, error } = await supabase
   .from('likes')
   .select('*', { count: 'exact', head: true })
   .eq('liked_id', user.id)
   .eq('action_type', 'like')
   
  if (error) throw error
  return count || 0
}