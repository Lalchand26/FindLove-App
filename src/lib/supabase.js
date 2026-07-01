import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,      // Browser close/refresh pe logout
    autoRefreshToken: false,    // Token auto refresh band
    detectSessionInUrl: false,  // URL se session detect na kare
    storage: undefined          // LocalStorage use na kare
  }
})