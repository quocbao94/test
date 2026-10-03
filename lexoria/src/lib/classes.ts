export type ClassId = "scholar" | "bard" | "ranger" | "sage";

export interface ClassDef {
  id: ClassId;
  name: string;
  emoji: string;
  description: string;
  color: number;
}

export const CLASSES: ClassDef[] = [
  {
    id: "scholar",
    name: "Scholar",
    emoji: "📜",
    description: "Vũ khí rèn từ bài viết mạnh hơn (+2 sát thương)",
    color: 0x7b5ea7,
  },
  {
    id: "bard",
    name: "Bard",
    emoji: "🎻",
    description: "+30% XP khi trò chuyện với NPC",
    color: 0xd0606e,
  },
  {
    id: "ranger",
    name: "Ranger",
    emoji: "🏹",
    description: "+2 sát thương cơ bản khi săn quái từ vựng",
    color: 0x4f9a5a,
  },
  {
    id: "sage",
    name: "Sage",
    emoji: "🔮",
    description: "+10% XP cho mọi hoạt động",
    color: 0x3f7fbf,
  },
];

export function classDef(id: ClassId): ClassDef {
  return CLASSES.find((c) => c.id === id)!;
}

export type XpSource = "battle" | "dialogue" | "writing" | "quest";

export function xpMultiplier(cls: ClassId, source: XpSource): number {
  if (cls === "sage") return 1.1;
  if (cls === "bard" && source === "dialogue") return 1.3;
  return 1;
}

export function damageBonus(cls: ClassId, weaponBonus: number): number {
  if (cls === "ranger") return weaponBonus + 2;
  if (cls === "scholar" && weaponBonus > 0) return weaponBonus + 2;
  return weaponBonus;
}
