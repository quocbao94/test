import { describe, expect, it } from "vitest";
import { newerSave } from "./sync";
import { initialSave } from "../store/game";
import { offlineGoalCheck } from "./ai";

const profile = {
  name: "A",
  cls: "sage" as const,
  exam: "ielts" as const,
  target: 7,
  examDate: null,
};

describe("newerSave", () => {
  it("prefers remote when there is no local character", () => {
    expect(newerSave(initialSave(), { ...initialSave(), profile })).toBe("remote");
  });

  it("keeps the most recently updated save", () => {
    const local = { ...initialSave(), profile, updatedAt: "2026-10-02T00:00:00Z" };
    const remote = { ...initialSave(), profile, updatedAt: "2026-10-01T00:00:00Z" };
    expect(newerSave(local, remote)).toBe("local");
    expect(newerSave(local, { ...remote, updatedAt: "2026-10-03T00:00:00Z" })).toBe("remote");
    expect(newerSave(local, null)).toBe("local");
  });
});

describe("offlineGoalCheck", () => {
  it("needs enough English with at least two reasons", () => {
    expect(offlineGoalCheck([{ role: "user", content: "let me in" }])).toBe(false);
    expect(
      offlineGoalCheck([
        { role: "user", content: "You should let me pass because I have trained for weeks." },
        {
          role: "user",
          content: "Also, the elder asked me to defeat the word monsters in the forest.",
        },
      ]),
    ).toBe(true);
  });
});
