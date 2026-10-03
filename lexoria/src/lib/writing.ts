export interface CriterionScore {
  band: number;
  comment: string;
}

export interface WritingGrade {
  overall: number;
  task_response: CriterionScore;
  coherence_cohesion: CriterionScore;
  lexical_resource: CriterionScore;
  grammar: CriterionScore;
  corrections: { original: string; improved: string; explanation: string }[];
  band_upgrades: string[];
}

export interface Weapon {
  id: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  bonus: number;
  band: number;
  promptId: string;
  createdAt: string;
}

export const RARITY_LABEL: Record<Weapon["rarity"], string> = {
  common: "Thường",
  rare: "Hiếm",
  epic: "Sử thi",
  legendary: "Huyền thoại",
};

/** Round to the nearest 0.5 like an IELTS band. */
export function roundBand(n: number): number {
  return Math.min(9, Math.max(0, Math.round(n * 2) / 2));
}

export function forgeWeapon(band: number, promptId: string, now = new Date()): Weapon {
  const b = roundBand(band);
  const rarity: Weapon["rarity"] =
    b >= 8 ? "legendary" : b >= 7 ? "epic" : b >= 6 ? "rare" : "common";
  const names: Record<Weapon["rarity"], string> = {
    common: "Bút Sắt",
    rare: "Kiếm Mệnh Đề",
    epic: "Thương Lập Luận",
    legendary: "Ngòi Bút Band 9",
  };
  return {
    id: `${promptId}:${now.getTime()}`,
    name: `${names[rarity]} (Band ${b})`,
    rarity,
    bonus: Math.max(1, Math.round((b - 3) * 1.5)),
    band: b,
    promptId,
    createdAt: now.toISOString(),
  };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isCriterion(v: unknown): v is CriterionScore {
  const c = v as CriterionScore;
  return !!c && typeof c.band === "number" && typeof c.comment === "string";
}

/** Validate the grader's JSON before trusting it in game logic. */
export function parseWritingGrade(raw: unknown): WritingGrade {
  const g = raw as WritingGrade;
  if (
    !g ||
    typeof g.overall !== "number" ||
    !isCriterion(g.task_response) ||
    !isCriterion(g.coherence_cohesion) ||
    !isCriterion(g.lexical_resource) ||
    !isCriterion(g.grammar) ||
    !Array.isArray(g.corrections) ||
    !Array.isArray(g.band_upgrades)
  ) {
    throw new Error("Kết quả chấm không đúng định dạng");
  }
  return { ...g, overall: roundBand(g.overall) };
}
