import { describe, expect, it } from "vitest";
import { WORDS, wordsOfTopic } from "../content";
import { blankOut, makeQuestion } from "./questions";
import { seededRng } from "./random";

describe("blankOut", () => {
  it("hides the target word case-insensitively", () => {
    expect(blankOut("Deforestation destroys habitats.", "deforestation")).toBe(
      "_____ destroys habitats.",
    );
  });
});

describe("makeQuestion", () => {
  const pool = wordsOfTopic("environment");

  it.each(["meaning", "fill", "collocation"] as const)("builds a valid %s question", (kind) => {
    const rng = seededRng(42);
    for (const target of pool) {
      const q = makeQuestion(target, pool, rng, kind);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      const correct = kind === "meaning" ? target.vi : target.word;
      expect(q.options[q.answerIndex]).toBe(correct);
      if (q.context) expect(q.context).toContain("_____");
    }
  });

  it("never offers a wrong option that also fits the blank", () => {
    // "_____ education" — compulsory, inclusive and tertiary all fit
    const words = wordsOfTopic("education");
    const tertiary = words.find((w) => w.word === "tertiary")!;
    for (let seed = 0; seed < 50; seed++) {
      const q = makeQuestion(tertiary, words, seededRng(seed), "collocation");
      expect(q.options).not.toContain("compulsory");
      expect(q.options).not.toContain("inclusive");
    }
    for (const kind of ["fill", "collocation"] as const) {
      for (const target of WORDS) {
        const q = makeQuestion(target, WORDS, seededRng(7), kind);
        const fits = WORDS.filter(
          (w) =>
            blankOut(w.collocation, w.word).toLowerCase() === q.context!.toLowerCase() ||
            blankOut(w.example, w.word).toLowerCase() === q.context!.toLowerCase(),
        ).map((w) => w.word);
        expect(q.options.filter((o) => fits.includes(o))).toEqual([target.word]);
      }
    }
  });

  it("every word in the content has a blankable example and collocation", () => {
    for (const w of WORDS) {
      expect(blankOut(w.example, w.word)).not.toBe(w.example);
      expect(blankOut(w.collocation, w.word)).not.toBe(w.collocation);
    }
  });
});
