import { createEmptyCard, fsrs, Rating, State, TypeConvert, type Card } from "ts-fsrs";

/** JSON-safe card (dates as ISO strings) so it can live in localStorage / Postgres jsonb. */
export interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: string;
  /** Lượt trả lời đúng/sai tích lũy — để hiển thị trong Bestiary */
  correct: number;
  wrong: number;
}

const scheduler = fsrs({ enable_fuzz: false });

function toStored(card: Card, correct: number, wrong: number): StoredCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review?.toISOString(),
    correct,
    wrong,
  };
}

export function newCard(now = new Date()): StoredCard {
  return toStored(createEmptyCard(now), 0, 0);
}

/**
 * Grade a battle answer: wrong → Again, slow correct → Good, fast correct → Easy.
 */
export function review(
  card: StoredCard,
  correct: boolean,
  fast: boolean,
  now = new Date(),
): StoredCard {
  const grade = !correct ? Rating.Again : fast ? Rating.Easy : Rating.Good;
  const next = scheduler.next(TypeConvert.card(card), now, grade).card;
  return toStored(next, card.correct + (correct ? 1 : 0), card.wrong + (correct ? 0 : 1));
}

export function isDue(card: StoredCard, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

export type Mastery = "egg" | "hatchling" | "adult" | "legend";

export const MASTERY_LABEL: Record<Mastery, string> = {
  egg: "🥚 Trứng",
  hatchling: "🐣 Non",
  adult: "🐉 Trưởng thành",
  legend: "👑 Huyền thoại",
};

/**
 * Mastery tier from FSRS stability (≈ days until recall drops to 90%) plus successful repetitions,
 * so one lucky fast answer can't make a word "adult".
 */
export function mastery(card: StoredCard): Mastery {
  if (card.state === State.New || card.reps === 0) return "egg";
  if (card.correct >= 5 && card.stability >= 21) return "legend";
  if (card.correct >= 3 && card.stability >= 3) return "adult";
  return "hatchling";
}
