// Integration test for the deployed Edge Functions (npc-chat, grade-writing) on the Supabase project in
// .env.development. Run with `SUPABASE_SERVICE_ROLE_KEY=... npm run test:cloud`; skipped by plain `npm test`.
// Works both before and after ANTHROPIC_API_KEY is set: without it the functions must answer 503
// `ai_disabled` without touching the quota; with it they must answer and consume one call.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

// The app tsconfig has no Node types; vitest runs in Node, so `process` is there at runtime
const serviceKey = (globalThis as { process?: { env: Record<string, string | undefined> } }).process
  ?.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && serviceKey);

const chat = {
  npcId: "guard",
  mode: "reply",
  messages: [{ role: "user", content: "Hello there" }],
};

function call(fn: string, body: unknown, token?: string) {
  return fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!enabled)("edge functions (live Supabase)", () => {
  let admin: SupabaseClient;
  let userId = "";
  let token = "";

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, serviceKey!, { auth: { persistSession: false } });
    const player = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const email = `lexoria-fn-${Date.now().toString(36)}@example.com`;
    const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw error;
    const { data } = await player.auth.verifyOtp({
      email,
      token: link.properties.email_otp,
      type: "email",
    });
    userId = data.user!.id;
    token = data.session!.access_token;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  const quotaUsed = async () => {
    const { data } = await admin.from("ai_usage").select("count").eq("user_id", userId);
    return data?.[0]?.count ?? 0;
  };

  it("requires a JWT", async () => {
    expect((await call("npc-chat", chat)).status).toBe(401);
    expect((await call("grade-writing", {})).status).toBe(401);
  });

  it("rejects the anon key as a player", async () => {
    const res = await call("npc-chat", chat, SUPABASE_ANON_KEY);
    expect([401, 503]).toContain(res.status);
  });

  it("validates input before using the quota", async () => {
    expect((await call("npc-chat", { npcId: "nobody" }, token)).status).toBe(400);
    const essay = { promptId: "t2-technology-children", essay: "too short" };
    expect((await call("grade-writing", essay, token)).status).toBe(400);
    expect(await quotaUsed()).toBe(0);
  });

  it("answers a signed-in player, or says AI is off without spending quota", async () => {
    const res = await call("npc-chat", chat, token);
    if (res.status === 503) {
      expect((await res.json()).code).toBe("ai_disabled");
      expect(await quotaUsed()).toBe(0);
    } else {
      expect(res.status).toBe(200);
      expect((await res.text()).length).toBeGreaterThan(0);
      expect(await quotaUsed()).toBe(1);
    }
  });
});
