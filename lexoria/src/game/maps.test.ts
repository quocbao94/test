import { describe, expect, it } from "vitest";
import { MAPS, parseMap, T } from "./maps";

describe("maps", () => {
  for (const [id, rows] of Object.entries(MAPS)) {
    it(`${id} is rectangular and only uses known characters`, () => {
      expect(new Set(rows.map((r) => r.length)).size).toBe(1);
      for (const row of rows) expect(row).toMatch(/^[#~=.,FRHDGETP123AmX]+$/);
    });

    it(`${id} has exactly one player spawn`, () => {
      expect(parseMap(rows).spawns.filter((s) => s.ch === "P")).toHaveLength(1);
    });
  }

  it("town has all NPCs, the forge, a gate and the forest exit", () => {
    const chars = parseMap(MAPS.town).spawns.map((s) => s.ch);
    for (const ch of ["1", "2", "3", "A", "E"]) expect(chars).toContain(ch);
    expect(parseMap(MAPS.town).tiles.flat()).toContain(T.Gate);
  });

  it("forest has monsters, a boss and the town exit", () => {
    const chars = parseMap(MAPS.forest).spawns.map((s) => s.ch);
    expect(chars.filter((c) => c === "m").length).toBeGreaterThanOrEqual(10);
    expect(chars).toContain("X");
    expect(chars).toContain("T");
  });
});
