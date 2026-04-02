// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// We pull the 'secret keys' from our .env safe
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This 'supabase' object is the walkie-talkie we use to talk to the database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);