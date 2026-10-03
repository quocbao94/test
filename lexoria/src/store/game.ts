import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { WORDS_BY_ID } from "../content";
import { maxHpFor } from "../lib/battle";
import { damageBonus, xpMultiplier, type ClassId, type XpSource } from "../lib/classes";
import {
  dayKey,
  makeDailyQuests,
  progressQuests,
  touchStreak,
  type DailyQuest,
  type QuestKind,
  type Streak,
} from "../lib/daily";
import { addXp } from "../lib/progression";
import { isDue, newCard, review, type StoredCard } from "../lib/srs";
import type { Weapon } from "../lib/writing";

export type Exam = "ielts" | "toeic";

export interface Profile {
  name: string;
  cls: ClassId;
  exam: Exam;
  /** IELTS band (vd 6.5) hoặc điểm TOEIC (vd 750) */
  target: number;
  examDate: string | null;
}

export interface Flags {
  gateOpened: boolean;
  bossDefeated: boolean;
}

/** Everything that is saved (localStorage + Supabase). */
export interface SaveData {
  profile: Profile | null;
  level: number;
  xp: number;
  hp: number;
  cards: Record<string, StoredCard>;
  weapons: Weapon[];
  equippedWeaponId: string | null;
  flags: Flags;
  quests: DailyQuest[];
  questDay: string;
  streak: Streak;
  /** Lỗi hay gặp do Claude ghi nhận — dùng cho nhiệm vụ cá nhân hóa sau này */
  mistakes: string[];
  updatedAt: string;
}

interface Actions {
  createCharacter: (p: Profile) => void;
  gainXp: (amount: number, source: XpSource) => number;
  recordAnswer: (wordId: string, correct: boolean, fast: boolean) => void;
  setHp: (hp: number) => void;
  healFull: () => void;
  progressQuest: (kind: QuestKind, amount?: number) => void;
  claimQuest: (id: string) => void;
  ensureToday: () => void;
  addWeapon: (w: Weapon) => void;
  equipWeapon: (id: string) => void;
  setFlag: (flag: keyof Flags, value: boolean) => void;
  addMistakes: (m: string[]) => void;
  loadSave: (data: SaveData) => void;
  reset: () => void;
}

export type GameState = SaveData & Actions;

export function initialSave(): SaveData {
  return {
    profile: null,
    level: 1,
    xp: 0,
    hp: maxHpFor(1),
    cards: {},
    weapons: [],
    equippedWeaponId: null,
    flags: { gateOpened: false, bossDefeated: false },
    quests: makeDailyQuests(),
    questDay: dayKey(),
    streak: { count: 0, lastDay: null },
    mistakes: [],
    updatedAt: new Date(0).toISOString(),
  };
}

const stamp = () => ({ updatedAt: new Date().toISOString() });

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialSave(),

      createCharacter: (profile) => set({ ...initialSave(), profile, ...stamp() }),

      gainXp: (amount, source) => {
        const { profile, level, xp } = get();
        const mult = profile ? xpMultiplier(profile.cls, source) : 1;
        const r = addXp({ level, xp }, amount * mult);
        set({
          level: r.level,
          xp: r.xp,
          // Full heal on level up
          ...(r.leveledUp ? { hp: maxHpFor(r.level) } : {}),
          ...stamp(),
        });
        return r.leveledUp;
      },

      recordAnswer: (wordId, correct, fast) => {
        const { cards, streak } = get();
        const prev = cards[wordId];
        const wasDue = prev ? isDue(prev) : false;
        const next = review(prev ?? newCard(), correct, fast);
        set({
          cards: { ...cards, [wordId]: next },
          streak: touchStreak(streak, dayKey()),
          ...stamp(),
        });
        if (correct) get().progressQuest("correct");
        if (wasDue && prev && prev.reps > 0) get().progressQuest("review");
      },

      setHp: (hp) => set({ hp: Math.max(0, Math.min(maxHpFor(get().level), hp)), ...stamp() }),
      healFull: () => set({ hp: maxHpFor(get().level), ...stamp() }),

      progressQuest: (kind, amount = 1) => {
        get().ensureToday();
        set({ quests: progressQuests(get().quests, kind, amount), ...stamp() });
      },

      claimQuest: (id) => {
        const q = get().quests.find((x) => x.id === id);
        if (!q || q.claimed || q.progress < q.target) return;
        set({ quests: get().quests.map((x) => (x.id === id ? { ...x, claimed: true } : x)) });
        get().gainXp(q.xp, "quest");
      },

      ensureToday: () => {
        const today = dayKey();
        if (get().questDay !== today)
          set({ quests: makeDailyQuests(), questDay: today, ...stamp() });
      },

      addWeapon: (w) =>
        set({
          weapons: [...get().weapons, w],
          equippedWeaponId: get().equippedWeaponId ?? w.id,
          ...stamp(),
        }),
      equipWeapon: (id) => set({ equippedWeaponId: id, ...stamp() }),
      setFlag: (flag, value) => set({ flags: { ...get().flags, [flag]: value }, ...stamp() }),
      addMistakes: (m) => set({ mistakes: [...m, ...get().mistakes].slice(0, 50), ...stamp() }),

      loadSave: (data) => set({ ...data }),
      reset: () => set({ ...initialSave(), ...stamp() }),
    }),
    {
      name: "lexoria-save",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => toSave(s),
    },
  ),
);

export function toSave(s: SaveData): SaveData {
  return {
    profile: s.profile,
    level: s.level,
    xp: s.xp,
    hp: s.hp,
    cards: s.cards,
    weapons: s.weapons,
    equippedWeaponId: s.equippedWeaponId,
    flags: s.flags,
    quests: s.quests,
    questDay: s.questDay,
    streak: s.streak,
    mistakes: s.mistakes,
    updatedAt: s.updatedAt,
  };
}

// ---- Selectors ----

export function equippedWeapon(s: SaveData): Weapon | undefined {
  return s.weapons.find((w) => w.id === s.equippedWeaponId);
}

export function attackBonus(s: SaveData): number {
  const w = equippedWeapon(s);
  return s.profile ? damageBonus(s.profile.cls, w?.bonus ?? 0) : (w?.bonus ?? 0);
}

export function dueWordIds(s: SaveData, now = new Date()): string[] {
  return Object.entries(s.cards)
    .filter(([id, c]) => WORDS_BY_ID[id] && c.reps > 0 && isDue(c, now))
    .map(([id]) => id);
}

export function daysUntilExam(p: Profile | null, now = new Date()): number | null {
  if (!p?.examDate) return null;
  const diff =
    new Date(`${p.examDate}T00:00:00`).getTime() - new Date(dayKey(now) + "T00:00:00").getTime();
  return Math.round(diff / 86_400_000);
}
