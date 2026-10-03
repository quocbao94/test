export type QuestKind = "defeat" | "correct" | "review" | "talk";

export interface DailyQuest {
  id: string;
  kind: QuestKind;
  label: string;
  target: number;
  progress: number;
  xp: number;
  claimed: boolean;
}

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function makeDailyQuests(): DailyQuest[] {
  return [
    {
      id: "defeat",
      kind: "defeat",
      label: "Hạ 3 quái vật",
      target: 3,
      progress: 0,
      xp: 20,
      claimed: false,
    },
    {
      id: "correct",
      kind: "correct",
      label: "Trả lời đúng 20 câu",
      target: 20,
      progress: 0,
      xp: 20,
      claimed: false,
    },
    {
      id: "review",
      kind: "review",
      label: "Ôn lại 5 từ đến hạn",
      target: 5,
      progress: 0,
      xp: 15,
      claimed: false,
    },
    {
      id: "talk",
      kind: "talk",
      label: "Trò chuyện với 1 NPC",
      target: 1,
      progress: 0,
      xp: 10,
      claimed: false,
    },
  ];
}

export function progressQuests(quests: DailyQuest[], kind: QuestKind, amount = 1): DailyQuest[] {
  return quests.map((q) =>
    q.kind === kind ? { ...q, progress: Math.min(q.target, q.progress + amount) } : q,
  );
}

export interface Streak {
  count: number;
  lastDay: string | null;
}

/** Call when the player does any study activity today. */
export function touchStreak(streak: Streak, today: string): Streak {
  if (streak.lastDay === today) return streak;
  const yesterday = dayKey(new Date(new Date(`${today}T12:00:00`).getTime() - 86_400_000));
  const count = streak.lastDay === yesterday ? streak.count + 1 : 1;
  return { count, lastDay: today };
}

export function campfireLabel(count: number): string {
  if (count >= 30) return "🔥🔥🔥 Lửa thiêng";
  if (count >= 7) return "🔥🔥 Lửa trại lớn";
  if (count >= 1) return "🔥 Đốm lửa";
  return "🪵 Chưa nhóm lửa";
}
