import type { Word } from "../content";
import { pick, shuffle, type Rng } from "./random";

export type QuestionKind = "meaning" | "fill" | "collocation";

export interface Question {
  wordId: string;
  kind: QuestionKind;
  prompt: string;
  /** Câu/cụm từ tiếng Anh đi kèm (đã che từ khóa) */
  context?: string;
  options: string[];
  answerIndex: number;
}

const BLANK = "_____";

/** Replace the first case-insensitive occurrence of `word` in `text` with a blank. */
export function blankOut(text: string, word: string): string {
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx < 0) return text;
  return text.slice(0, idx) + BLANK + text.slice(idx + word.length);
}

function distractors(target: Word, pool: Word[], key: (w: Word) => string, rng: Rng): string[] {
  const seen = new Set([key(target)]);
  const out: string[] = [];
  // Prefer same part of speech so the wrong options are plausible
  const ranked = [
    ...shuffle(
      pool.filter((w) => w.pos === target.pos),
      rng,
    ),
    ...shuffle(
      pool.filter((w) => w.pos !== target.pos),
      rng,
    ),
  ];
  for (const w of ranked) {
    const k = key(w);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
    if (out.length === 3) break;
  }
  return out;
}

/**
 * Would `w` also correctly fill this blank? E.g. "_____ education" fits compulsory, inclusive and
 * tertiary — such words must never be offered as "wrong" options.
 */
function alsoFits(w: Word, context: string): boolean {
  const c = context.toLowerCase();
  return (
    blankOut(w.collocation, w.word).toLowerCase() === c ||
    blankOut(w.example, w.word).toLowerCase() === c
  );
}

export function makeQuestion(target: Word, pool: Word[], rng: Rng, kind?: QuestionKind): Question {
  const k = kind ?? pick<QuestionKind>(["meaning", "fill", "collocation"], rng);
  let others = pool.filter((w) => w.id !== target.id);

  let prompt: string;
  let context: string | undefined;
  let correct: string;
  let wrong: string[];

  switch (k) {
    case "meaning":
      prompt = `"${target.word}" ${target.ipa} nghĩa là gì?`;
      correct = target.vi;
      wrong = distractors(target, others, (w) => w.vi, rng);
      break;
    case "fill":
      prompt = "Chọn từ đúng để điền vào chỗ trống:";
      context = blankOut(target.example, target.word);
      others = others.filter((w) => !alsoFits(w, context!));
      correct = target.word;
      wrong = distractors(target, others, (w) => w.word, rng);
      break;
    case "collocation":
      prompt = "Hoàn thành cụm từ (collocation):";
      context = blankOut(target.collocation, target.word);
      others = others.filter((w) => !alsoFits(w, context!));
      correct = target.word;
      wrong = distractors(target, others, (w) => w.word, rng);
      break;
  }

  const options = shuffle([correct, ...wrong], rng);
  return {
    wordId: target.id,
    kind: k,
    prompt,
    context,
    options,
    answerIndex: options.indexOf(correct),
  };
}
