/** Total XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 50 + (level - 1) * 30;
}

export interface LevelState {
  level: number;
  xp: number;
}

export function addXp(state: LevelState, amount: number): LevelState & { leveledUp: number } {
  let { level, xp } = state;
  xp += Math.max(0, Math.round(amount));
  let leveledUp = 0;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    leveledUp += 1;
  }
  return { level, xp, leveledUp };
}

export const XP = {
  correctAnswer: 3,
  enemyDefeated: 10,
  bossDefeated: 60,
  dialogueGoal: 25,
  writingPerBand: 8,
} as const;

/** Level at which the boss of the Forest of Words can be challenged. */
export const BOSS_UNLOCK_LEVEL = 3;
