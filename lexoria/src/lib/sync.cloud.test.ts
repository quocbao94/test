// Integration test against a real Supabase project: email login, cloud save round-trip, and RLS.
// Run with `SUPABASE_SERVICE_ROLE_KEY=... npm run test:cloud` (reads the URL/anon key from .env.development).
// Skipped by plain `npm test`. Test users are created and deleted by the test itself.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initialSave, type SaveData } from "../store/game";
import { newerSave, pullRemote, pushSnapshot } from "./sync";
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

// The app tsconfig has no Node types; vitest runs in Node, so `process` is there at runtime
const serviceKey = (globalThis as { process?: { env: Record<string, string | undefined> } }).process
  ?.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(supabase && serviceKey);

const tag = Date.now().toString(36);
const emailA = `lexoria-test-a-${tag}@example.com`;
const emailB = `lexoria-test-b-${tag}@example.com`;

/** Signs in the way the game does (email OTP), minus the inbox: the admin API hands us the code. */
async function emailLogin(admin: SupabaseClient, client: SupabaseClient, email: string) {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const { data, error: verifyError } = await client.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: "email",
  });
  if (verifyError) throw verifyError;
  return data.user!.id;
}

describe.skipIf(!enabled)("cloud sync (live Supabase)", () => {
  let admin: SupabaseClient;
  let other: SupabaseClient;
  let userA = "";
  let userB = "";

  const save: SaveData = {
    ...initialSave(),
    profile: { name: "CloudTest", cls: "bard", exam: "ielts", target: 7.5, examDate: "2027-01-15" },
    level: 3,
    xp: 42,
    hp: 80,
    weapons: [],
    flags: { gateOpened: true, bossDefeated: false },
    streak: { count: 4, lastDay: "2026-10-03" },
    questDay: "2026-10-04",
    updatedAt: "2026-10-04T08:00:00.000Z",
  };

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, serviceKey!, { auth: { persistSession: false } });
    other = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    userA = await emailLogin(admin, supabase!, emailA);
    userB = await emailLogin(admin, other, emailB);
  });

  afterAll(async () => {
    // Rows go with the users (on delete cascade)
    for (const id of [userA, userB]) if (id) await admin.auth.admin.deleteUser(id);
  });

  it("logs in by email", async () => {
    const { data } = await supabase!.auth.getUser();
    expect(data.user?.email).toBe(emailA);
  });

  it("has no cloud save before the first push", async () => {
    expect(await pullRemote(userA)).toBeNull();
  });

  it("round-trips a save", async () => {
    const cards = {
      w1: { ...cardLike(), due: "2026-10-05T00:00:00.000Z" },
    } as unknown as SaveData["cards"];
    await pushSnapshot(userA, { ...save, cards });
    const remote = await pullRemote(userA);
    expect(remote).not.toBeNull();
    expect(remote!.profile).toEqual(save.profile);
    expect(remote!).toMatchObject({ level: 3, xp: 42, hp: 80, flags: save.flags });
    expect(remote!.streak).toEqual(save.streak);
    expect(remote!.questDay).toBe(save.questDay);
    expect(Object.keys(remote!.cards)).toEqual(["w1"]);
    expect(new Date(remote!.updatedAt).toISOString()).toBe(save.updatedAt);
  });

  it("overwrites with a newer push and picks it over an older local save", async () => {
    const newer = { ...save, xp: 99, updatedAt: "2026-10-04T09:00:00.000Z" };
    await pushSnapshot(userA, newer);
    const remote = await pullRemote(userA);
    expect(remote!.xp).toBe(99);
    expect(newerSave(save, remote)).toBe("remote");
  });

  it("hides one player's save from another (RLS)", async () => {
    const read = await other.from("player_stats").select("*").eq("user_id", userA);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);

    const write = await other.from("profiles").upsert({ ...profileRow(userA), name: "Hacker" });
    expect(write.error).not.toBeNull();

    const quota = await other.from("ai_usage").insert({ user_id: userB, day: "2026-10-04" });
    expect(quota.error).not.toBeNull();

    expect((await pullRemote(userA))!.profile!.name).toBe("CloudTest");
    expect(userB).not.toBe(userA);
  });

  function profileRow(id: string) {
    return { id, name: "x", class: "bard", exam: "ielts", target: 7 };
  }
  function cardLike() {
    return { stability: 1, difficulty: 5, reps: 1, lapses: 0, state: 2, last_review: null };
  }
});
