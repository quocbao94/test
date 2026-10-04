import { describe, expect, it } from "vitest";
import { countWords, forgeWeapon, parseWritingGrade, roundBand } from "./writing";

const crit = { band: 6, comment: "ok" };

describe("writing", () => {
  it("rounds to IELTS half bands", () => {
    expect(roundBand(6.3)).toBe(6.5);
    expect(roundBand(6.2)).toBe(6);
    expect(roundBand(12)).toBe(9);
  });

  it("forges stronger weapons for higher bands", () => {
    const low = forgeWeapon(5, "p");
    const high = forgeWeapon(8, "p");
    expect(low.rarity).toBe("common");
    expect(high.rarity).toBe("legendary");
    expect(high.bonus).toBeGreaterThan(low.bonus);
  });

  it("validates grader output", () => {
    const ok = parseWritingGrade({
      overall: 6.4,
      task_response: crit,
      coherence_cohesion: crit,
      lexical_resource: crit,
      grammar: crit,
      corrections: [],
      band_upgrades: [],
    });
    expect(ok.overall).toBe(6.5);
    expect(() => parseWritingGrade({ overall: 6 })).toThrow();
  });

  it("counts words", () => {
    expect(countWords("  one two\nthree  ")).toBe(3);
  });
});
