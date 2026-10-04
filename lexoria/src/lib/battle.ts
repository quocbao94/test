export const PLAYER_BASE_HP = 30;
export const ANSWER_TIME_LIMIT_MS = 15_000;
/** Answers faster than this are critical hits */
export const CRIT_WINDOW_MS = 4_000;

export interface AttackInput {
  correct: boolean;
  elapsedMs: number;
  combo: number;
  weaponBonus: number;
  level: number;
}

export interface AttackResult {
  damageToEnemy: number;
  damageToPlayer: number;
  crit: boolean;
  nextCombo: number;
}

export function comboMultiplier(combo: number): number {
  return 1 + Math.min(combo, 5) * 0.2;
}

export function resolveAnswer(input: AttackInput, enemyAttack: number): AttackResult {
  const timedOut = input.elapsedMs > ANSWER_TIME_LIMIT_MS;
  if (!input.correct || timedOut) {
    return { damageToEnemy: 0, damageToPlayer: enemyAttack, crit: false, nextCombo: 0 };
  }
  const base = 4 + input.level + input.weaponBonus;
  const crit = input.elapsedMs <= CRIT_WINDOW_MS;
  const damage = Math.round(base * comboMultiplier(input.combo) * (crit ? 1.5 : 1));
  return { damageToEnemy: damage, damageToPlayer: 0, crit, nextCombo: input.combo + 1 };
}

export interface EnemySpec {
  name: string;
  hp: number;
  attack: number;
  isBoss: boolean;
  questionCount: number;
}

export function enemyFor(level: number, isBoss: boolean, name: string): EnemySpec {
  if (isBoss) return { name, hp: 60 + level * 8, attack: 6 + level, isBoss, questionCount: 12 };
  return { name, hp: 14 + level * 3, attack: 3 + Math.floor(level / 2), isBoss, questionCount: 5 };
}

export function maxHpFor(level: number): number {
  return PLAYER_BASE_HP + (level - 1) * 5;
}
