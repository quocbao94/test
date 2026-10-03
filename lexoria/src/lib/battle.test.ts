import { describe, expect, it } from "vitest";
import { ANSWER_TIME_LIMIT_MS, comboMultiplier, resolveAnswer } from "./battle";

const base = { combo: 0, weaponBonus: 0, level: 1 };

describe("resolveAnswer", () => {
  it("wrong answer hurts the player and resets combo", () => {
    const r = resolveAnswer({ ...base, combo: 3, correct: false, elapsedMs: 1000 }, 5);
    expect(r).toEqual({ damageToEnemy: 0, damageToPlayer: 5, crit: false, nextCombo: 0 });
  });

  it("timeout counts as wrong", () => {
    const r = resolveAnswer({ ...base, correct: true, elapsedMs: ANSWER_TIME_LIMIT_MS + 1 }, 5);
    expect(r.damageToPlayer).toBe(5);
  });

  it("fast answers crit and combos scale damage", () => {
    const slow = resolveAnswer({ ...base, correct: true, elapsedMs: 8000 }, 5);
    const fast = resolveAnswer({ ...base, correct: true, elapsedMs: 1000 }, 5);
    const combo = resolveAnswer({ ...base, combo: 3, correct: true, elapsedMs: 8000 }, 5);
    expect(slow.damageToEnemy).toBe(5);
    expect(fast.crit).toBe(true);
    expect(fast.damageToEnemy).toBeGreaterThan(slow.damageToEnemy);
    expect(combo.damageToEnemy).toBeGreaterThan(slow.damageToEnemy);
    expect(combo.nextCombo).toBe(4);
  });

  it("caps combo multiplier", () => {
    expect(comboMultiplier(99)).toBe(comboMultiplier(5));
  });
});
