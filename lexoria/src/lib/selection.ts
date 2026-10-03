import { WORDS, wordsOfTopic, type TopicId, type Word } from "../content";
import { shuffle, type Rng } from "./random";
import { isDue, type StoredCard } from "./srs";

/**
 * Pick the words a monster will "be made of":
 * 1) words due for review (spaced repetition), 2) never-seen words, 3) anything else.
 * The boss draws from every topic.
 */
export function pickBattleWords(
  topic: TopicId | "all",
  cards: Record<string, StoredCard>,
  count: number,
  rng: Rng,
  now = new Date(),
): Word[] {
  const pool = topic === "all" ? WORDS : wordsOfTopic(topic);
  const due = pool.filter((w) => cards[w.id]?.reps && isDue(cards[w.id], now));
  const unseen = pool.filter((w) => !cards[w.id]);
  const rest = pool.filter((w) => !due.includes(w) && !unseen.includes(w));
  // Keep new words to a digestible handful per fight
  const newcomers = shuffle(unseen, rng).slice(0, Math.max(2, Math.ceil(count / 2)));
  const ordered = [
    ...shuffle(due, rng),
    ...newcomers,
    ...shuffle(rest, rng),
    ...shuffle(unseen, rng),
  ];
  return [...new Map(ordered.map((w) => [w.id, w])).values()].slice(0, count);
}
