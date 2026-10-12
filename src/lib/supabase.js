import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const HAS_SUPABASE = Boolean(url && key && !url.includes("xxxx"));
export const supabase = HAS_SUPABASE ? createClient(url, key) : null;
