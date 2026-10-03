import type { XpSource } from "../lib/classes";
import { useGame } from "../store/game";
import { useUi } from "../store/ui";

export function rewardXp(amount: number, source: XpSource) {
  const up = useGame.getState().gainXp(amount, source);
  if (up > 0) useUi.getState().toast(`⭐ Lên cấp ${useGame.getState().level}! Máu đã hồi đầy.`);
}
