import { describe, expect, it } from "vitest";
import { addXp, xpToNext } from "./progression";

describe("addXp", () => {
  it("levels up and carries over remaining XP", () => {
    const r = addXp({ level: 1, xp: 40 }, 20);
    expect(r).toEqual({ level: 2, xp: 10, leveledUp: 1 });
  });

  it("handles multiple level-ups at once", () => {
    const total = xpToNext(1) + xpToNext(2) + 5;
    expect(addXp({ level: 1, xp: 0 }, total)).toEqual({ level: 3, xp: 5, leveledUp: 2 });
  });

  it("ignores negative XP", () => {
    expect(addXp({ level: 2, xp: 7 }, -50)).toEqual({ level: 2, xp: 7, leveledUp: 0 });
  });
});
