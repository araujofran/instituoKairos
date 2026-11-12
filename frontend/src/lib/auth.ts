import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const memory = new Map<string, string>();
// Keep sessions in memory; only the one-time PKCE verifier survives the OAuth redirect.
const storage = {
  getItem(name: string) {
    if (name.endsWith("-code-verifier") && typeof window !== "undefined") {
      return window.sessionStorage.getItem(name);
    }
    return memory.get(name) ?? null;
  },
  setItem(name: string, value: string) {
    if (name.endsWith("-code-verifier") && typeof window !== "undefined") {
      window.sessionStorage.setItem(name, value);
    } else memory.set(name, value);
  },
  removeItem(name: string) {
    memory.delete(name);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(name);
  },
};
export const auth = url && key ? createClient(url, key, {
  auth: { persistSession: true, storage, flowType: "pkce", detectSessionInUrl: true },
}) : null;
