import { classDef } from "../lib/classes";
import { campfireLabel } from "../lib/daily";
import { maxHpFor } from "../lib/battle";
import { xpToNext } from "../lib/progression";
import { daysUntilExam, useGame } from "../store/game";
import { useUi } from "../store/ui";
import { Bar } from "./Modal";

export function Hud({ mapName }: { mapName: string }) {
  const s = useGame();
  const open = useUi((u) => u.open);
  if (!s.profile) return null;
  const cls = classDef(s.profile.cls);
  const days = daysUntilExam(s.profile);
  const claimable = s.quests.filter((q) => !q.claimed && q.progress >= q.target).length;

  return (
    <div className="hud">
      <div className="hud-card">
        <div className="row" style={{ gap: 6 }}>
          <b>
            {cls.emoji} {s.profile.name}
          </b>
          <span className="hud-tag">Cấp {s.level}</span>
        </div>
        <div className="hud-tag">
          ❤️ {s.hp}/{maxHpFor(s.level)}
        </div>
        <Bar value={s.hp} max={maxHpFor(s.level)} kind="hp" />
        <div className="hud-tag" style={{ marginTop: 4 }}>
          ✨ XP {s.xp}/{xpToNext(s.level)}
        </div>
        <Bar value={s.xp} max={xpToNext(s.level)} kind="xp" />
        <div className="hud-tag hud-extra" style={{ marginTop: 4 }}>
          {campfireLabel(s.streak.count)} · {s.streak.count} ngày
        </div>
        <div className="hud-tag hud-extra">
          📍 {mapName}
          {days !== null && days >= 0 && ` · ⏳ ${days} ngày tới kỳ thi`}
        </div>
      </div>
      <span className="spacer" />
      <div className="hud-buttons">
        <button className="btn" onClick={() => open({ type: "bestiary" })} title="Sổ từ (B)">
          📖 Sổ từ
        </button>
        <button className="btn" onClick={() => open({ type: "quests" })} title="Nhiệm vụ (Q)">
          📜 Nhiệm vụ{claimable > 0 && ` (${claimable})`}
        </button>
        <button className="btn" onClick={() => open({ type: "character" })} title="Nhân vật (C)">
          🧙 Nhân vật
        </button>
      </div>
    </div>
  );
}
