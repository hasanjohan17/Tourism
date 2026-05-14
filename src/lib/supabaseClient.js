import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// تحقق من المتغيرات وأظهر رسالة خطأ واضحة
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase configuration is missing!");
  console.error("VITE_SUPABASE_URL:", supabaseUrl ? "✅" : "❌ NOT SET");
  console.error("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅" : "❌ NOT SET");
  console.error("\n📝 Please follow SETUP_SUPABASE.md to configure your environment.");
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
