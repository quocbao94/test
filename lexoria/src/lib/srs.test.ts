import { describe, expect, it } from "vitest";
import { isDue, mastery, newCard, review } from "./srs";

const t0 = new Date("2026-10-01T08:00:00Z");

describe("srs", () => {
  it("new cards are due immediately and start as eggs", () => {
    const c = newCard(t0);
    expect(isDue(c, t0)).toBe(true);
    expect(mastery(c)).toBe("egg");
  });

  it("correct answers push the due date out; wrong answers keep it close", () => {
    const good = review(newCard(t0), true, true, t0);
    const bad = review(newCard(t0), false, false, t0);
    expect(new Date(good.due).getTime()).toBeGreaterThan(new Date(bad.due).getTime());
    expect(good.correct).toBe(1);
    expect(bad.wrong).toBe(1);
    expect(isDue(good, t0)).toBe(false);
  });

  it("one fast answer is not enough to master a word", () => {
    expect(mastery(review(newCard(t0), true, true, t0))).toBe("hatchling");
  });

  it("repeated spaced reviews grow mastery", () => {
    let c = newCard(t0);
    let t = t0;
    for (let i = 0; i < 6; i++) {
      c = review(c, true, true, t);
      t = new Date(c.due);
    }
    expect(mastery(c)).toBe("legend");
  });

  it("survives a JSON round trip", () => {
    const c = JSON.parse(JSON.stringify(review(newCard(t0), true, false, t0)));
    const later = new Date(c.due);
    const next = review(c, true, false, later);
    expect(next.reps).toBe(2);
    expect(mastery(next)).not.toBe("egg");
  });
});
