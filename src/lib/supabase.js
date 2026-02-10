import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://psjmhocozywyhyypurok.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzam1ob2Nvenl3eWh5eXB1cm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzYxNjMsImV4cCI6MjA4NjMxMjE2M30.sdQgHVFW2R668AEtitU9ePr_DPVw71YA0VBT-8KYaOQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
