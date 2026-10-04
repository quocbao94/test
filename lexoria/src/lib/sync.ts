import type { StoredCard } from "./srs";
import { supabase } from "./supabase";
import type { SaveData } from "../store/game";

/**
 * Cloud save. Local state is always the working copy; Supabase is a mirror.
 * On login the newer of (local, remote) wins, compared by `updatedAt`.
 */

export async function pullRemote(userId: string): Promise<SaveData | null> {
  if (!supabase) return null;
  const [profile, stats, cards, quests] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("player_stats").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("vocab_cards").select("word_id, card").eq("user_id", userId),
    supabase
      .from("quest_progress")
      .select("*")
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(1),
  ]);
  for (const r of [profile, stats, cards, quests]) if (r.error) throw r.error;
  if (!profile.data || !stats.data) return null;

  const p = profile.data;
  const s = stats.data;
  const q = quests.data?.[0];
  return {
    profile: {
      name: p.name,
      cls: p.class,
      exam: p.exam,
      target: Number(p.target),
      examDate: p.exam_date,
    },
    level: s.level,
    xp: s.xp,
    hp: s.hp,
    cards: Object.fromEntries((cards.data ?? []).map((c) => [c.word_id, c.card as StoredCard])),
    weapons: s.weapons ?? [],
    equippedWeaponId: s.equipped_weapon_id,
    flags: s.flags ?? { gateOpened: false, bossDefeated: false },
    quests: q?.quests ?? [],
    questDay: q?.day ?? "",
    streak: { count: s.streak_count ?? 0, lastDay: s.streak_last_day },
    mistakes: s.mistakes ?? [],
    updatedAt: s.updated_at,
  };
}

export async function pushSnapshot(userId: string, d: SaveData): Promise<void> {
  if (!supabase || !d.profile) return;
  const p = d.profile;
  const results = await Promise.all([
    supabase.from("profiles").upsert({
      id: userId,
      name: p.name,
      class: p.cls,
      exam: p.exam,
      target: p.target,
      exam_date: p.examDate,
    }),
    supabase.from("player_stats").upsert({
      user_id: userId,
      level: d.level,
      xp: d.xp,
      hp: d.hp,
      streak_count: d.streak.count,
      streak_last_day: d.streak.lastDay,
      flags: d.flags,
      weapons: d.weapons,
      equipped_weapon_id: d.equippedWeaponId,
      mistakes: d.mistakes,
      updated_at: d.updatedAt,
    }),
    Object.keys(d.cards).length
      ? supabase.from("vocab_cards").upsert(
          Object.entries(d.cards).map(([word_id, card]) => ({
            user_id: userId,
            word_id,
            card,
            due: card.due,
          })),
        )
      : Promise.resolve({ error: null }),
    supabase.from("quest_progress").upsert({ user_id: userId, day: d.questDay, quests: d.quests }),
  ]);
  for (const r of results) if (r.error) throw r.error;
}

/** Decide which save to keep after login. */
export function newerSave(local: SaveData, remote: SaveData | null): "local" | "remote" {
  if (!remote) return "local";
  if (!local.profile) return "remote";
  return new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime()
    ? "remote"
    : "local";
}
