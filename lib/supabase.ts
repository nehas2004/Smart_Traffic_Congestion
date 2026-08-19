import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const isConfigured = 
  supabaseUrl && 
  isValidUrl(supabaseUrl) && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null

