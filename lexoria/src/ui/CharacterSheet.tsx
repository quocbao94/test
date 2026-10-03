import { WORDS } from "../content";
import { classDef } from "../lib/classes";
import { mastery, MASTERY_LABEL, type Mastery } from "../lib/srs";
import { daysUntilExam, useGame } from "../store/game";
import { useUi } from "../store/ui";
import { AuthPanel } from "./AuthPanel";
import { Armory } from "./Forge";
import { Modal } from "./Modal";

export function CharacterSheet() {
  const close = useUi((u) => u.close);
  const s = useGame();
  if (!s.profile) return null;
  const cls = classDef(s.profile.cls);
  const days = daysUntilExam(s.profile);

  const tiers: Record<Mastery, number> = { egg: 0, hatchling: 0, adult: 0, legend: 0 };
  for (const c of Object.values(s.cards)) tiers[mastery(c)]++;
  const answered = Object.values(s.cards).reduce(
    (a, c) => ({ correct: a.correct + c.correct, wrong: a.wrong + c.wrong }),
    { correct: 0, wrong: 0 },
  );
  const accuracy =
    answered.correct + answered.wrong
      ? Math.round((answered.correct / (answered.correct + answered.wrong)) * 100)
      : 0;
  const bestBand = s.weapons.reduce((m, w) => Math.max(m, w.band), 0);

  return (
    <Modal onClose={close}>
      <h2>
        {cls.emoji} {s.profile.name} — {cls.name} cấp {s.level}
      </h2>
      <p className="muted">{cls.description}</p>
      <p>
        🎯 Mục tiêu:{" "}
        {s.profile.exam === "ielts"
          ? `IELTS band ${s.profile.target}`
          : `TOEIC ${s.profile.target}`}
        {days !== null && (days >= 0 ? ` · còn ${days} ngày` : " · đã qua ngày thi")}
      </p>

      <h3>📊 Chỉ số</h3>
      <div className="bands">
        <div className="band">
          <div className="muted">Từ vựng đã gặp</div>
          <b>
            {Object.keys(s.cards).length}/{WORDS.length}
          </b>
        </div>
        <div className="band">
          <div className="muted">Độ chính xác</div>
          <b>{accuracy}%</b>
        </div>
        <div className="band">
          <div className="muted">Writing (band cao nhất)</div>
          <b>{bestBand || "—"}</b>
        </div>
      </div>
      <p className="muted">
        {(Object.keys(tiers) as Mastery[])
          .map((t) => `${MASTERY_LABEL[t]}: ${tiers[t]}`)
          .join(" · ")}
      </p>

      <Armory />

      {s.mistakes.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>📝 Nhật ký lỗi</h3>
          <ul>
            {s.mistakes.slice(0, 10).map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </>
      )}

      <h3 style={{ marginTop: 12 }}>☁️ Tài khoản</h3>
      <AuthPanel />

      <div className="row" style={{ marginTop: 16 }}>
        <span className="spacer" />
        <button
          className="btn small ghost"
          onClick={() => {
            if (confirm("Xóa nhân vật và bắt đầu lại? Không thể hoàn tác.")) {
              close();
              s.reset();
            }
          }}
        >
          🗑️ Tạo lại nhân vật
        </button>
      </div>
    </Modal>
  );
}
