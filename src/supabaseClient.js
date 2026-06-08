import { createClient } from '@supabase/supabase-js'

// Reemplaza estas dos líneas con los datos reales de tu proyecto Flashealo-core
// Los encuentras en Supabase > Project Settings > API
const supabaseUrl = 'https://muvzhnnsdnztlhynuipd.supabase.co/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dnpobm5zZG56dGxoeW51aXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTYyNjgsImV4cCI6MjA5NjIzMjI2OH0.zec3LdfU3i0gdcCEDeHaIlMz1xSNTydpth50obaGesU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)