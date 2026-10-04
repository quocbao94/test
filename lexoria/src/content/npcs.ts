export type NpcId = "elder" | "questmaster" | "guard";

export interface NpcGoal {
  /** Mục tiêu hiển thị cho người chơi (tiếng Việt) */
  summaryVi: string;
  /** Mô tả mục tiêu cho Claude chấm (tiếng Anh) */
  successCriteria: string;
}

export interface Npc {
  id: NpcId;
  name: string;
  title: string;
  /** Lời chào soạn sẵn — cũng dùng khi chạy offline */
  greeting: string;
  offlineLines: string[];
  goal?: NpcGoal;
}

export const NPCS: Record<NpcId, Npc> = {
  elder: {
    id: "elder",
    name: "Elder Rowan",
    title: "Trưởng làng",
    greeting:
      "Welcome, young Wordsmith. The Curse of Silence has turned our words into monsters. Will you help us?",
    offlineLines: [
      "The Forest of Words lies to the east. Defeat the word-monsters to restore their meaning.",
      "Every word you master becomes part of your Bestiary. Review them, or they will return!",
      "When you are ready, visit the Forge of Prose to craft a weapon from your writing.",
    ],
  },
  questmaster: {
    id: "questmaster",
    name: "Mira",
    title: "Người giữ bảng nhiệm vụ",
    greeting: "Fresh quests every day! Complete them to keep your campfire burning.",
    offlineLines: [
      "Check your daily quests in the top-right corner.",
      "A long streak makes your campfire grow. Don't let it go out!",
    ],
  },
  guard: {
    id: "guard",
    name: "Sir Aldric",
    title: "Lính gác cổng rừng",
    greeting:
      "Halt! The Forest of Words is dangerous. Why should I let a novice like you through this gate?",
    offlineLines: [
      "Hmm. Is that all? Give me another good reason, Wordsmith.",
      "I am listening. Convince me — and speak clearly.",
    ],
    goal: {
      summaryVi:
        "Thuyết phục Sir Aldric mở cổng rừng bằng ít nhất 2 lý do rõ ràng (bằng tiếng Anh).",
      successCriteria:
        "The player gives at least two clear, relevant reasons in English why they should be allowed into the forest (e.g. their purpose, preparation, or courage), and responds to the guard's objections politely.",
    },
  },
};
