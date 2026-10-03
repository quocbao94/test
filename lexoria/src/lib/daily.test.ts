import { describe, expect, it } from "vitest";
import { makeDailyQuests, progressQuests, touchStreak } from "./daily";

describe("streak", () => {
  it("continues on consecutive days and resets after a gap", () => {
    let s = touchStreak({ count: 0, lastDay: null }, "2026-10-01");
    expect(s.count).toBe(1);
    s = touchStreak(s, "2026-10-01");
    expect(s.count).toBe(1);
    s = touchStreak(s, "2026-10-02");
    expect(s.count).toBe(2);
    s = touchStreak(s, "2026-10-05");
    expect(s.count).toBe(1);
  });

  it("handles month boundaries", () => {
    expect(touchStreak({ count: 4, lastDay: "2026-09-30" }, "2026-10-01").count).toBe(5);
  });
});

describe("daily quests", () => {
  it("caps progress at the target", () => {
    const q = progressQuests(makeDailyQuests(), "defeat", 10).find((x) => x.kind === "defeat")!;
    expect(q.progress).toBe(q.target);
  });
});
