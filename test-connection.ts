import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data, error } = await supabase.from("profiles").select("*").limit(1);

if (error) {
  console.log("Connected to Supabase, and got an expected response:");
  console.log(error.message);
} else {
  console.log("Connected successfully. Data:", data);
}
