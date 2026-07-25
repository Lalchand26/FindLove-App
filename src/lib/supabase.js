import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Reset link authentication handle karne ke liye zaroori hai
    autoRefreshToken: true,     // User Session ko active rakhne ke liye
    detectSessionInUrl: true    // IMPORTANT: Email reset link ke URL tokens readout karne ke liye TRUE hona chahiye
  }
})