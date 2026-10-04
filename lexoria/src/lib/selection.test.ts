import { describe, expect, it } from "vitest";
import { wordsOfTopic } from "../content";
import { seededRng } from "./random";
import { pickBattleWords } from "./selection";
import { newCard, review } from "./srs";

describe("pickBattleWords", () => {
  const t0 = new Date("2026-10-01T00:00:00Z");
  const words = wordsOfTopic("technology");

  it("returns unique words of the topic", () => {
    const picked = pickBattleWords("technology", {}, 5, seededRng(1), t0);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((w) => w.id)).size).toBe(5);
    expect(picked.every((w) => w.topic === "technology")).toBe(true);
  });

  it("puts due review words first", () => {
    const dueWord = words[7];
    // Reviewed wrong a while ago → due now
    const card = review(newCard(new Date("2026-09-01")), false, false, new Date("2026-09-01"));
    const picked = pickBattleWords("technology", { [dueWord.id]: card }, 5, seededRng(2), t0);
    expect(picked[0].id).toBe(dueWord.id);
  });

  it("boss draws from all topics", () => {
    const picked = pickBattleWords("all", {}, 40, seededRng(3), t0);
    expect(new Set(picked.map((w) => w.topic)).size).toBe(3);
  });
});
