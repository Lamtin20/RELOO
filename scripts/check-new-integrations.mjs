import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchGhtkQuote } from "../lib/ghtk/client.js";
process.loadEnvFile(resolve(".env.local"));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { error } = await db.from("profiles").select("id", { head: true, count: "exact" });
console.log(JSON.stringify({supabase: !error, errorCode: error?.code || null}));
try {
  const quote = await fetchGhtkQuote({ pick_province: "Hà Nội", pick_ward: "Dịch Vọng", pick_district: "Cầu Giấy", province: "Hà Nội", ward: "Bạch Mai", district: "Hai Bà Trưng", weight: 1000, value: 100000, transport: "road" });
  console.log(JSON.stringify({ghtk: true, quote}));
} catch(error) { console.log(JSON.stringify({ghtk:false,code:error.code,status:error.status,message:error.message})); }
