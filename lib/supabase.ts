import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing! Check your .env.local file.");
} else {
    console.log("Supabase Client Initialized with URL:", supabaseUrl.substring(0, 15) + "...");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
