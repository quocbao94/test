import { campfireLabel } from "../lib/daily";
import { useGame } from "../store/game";
import { useUi } from "../store/ui";
import { Bar, Modal } from "./Modal";

export function Quests() {
  const close = useUi((u) => u.close);
  const { quests, claimQuest, streak, flags, level } = useGame();

  return (
    <Modal onClose={close}>
      <h2>📜 Nhiệm vụ</h2>
      <p>
        {campfireLabel(streak.count)} — chuỗi <b>{streak.count}</b> ngày học liên tiếp. Học mỗi ngày
        để lửa trại cháy mãi!
      </p>
      <h3>Hằng ngày</h3>
      <div className="col">
        {quests.map((q) => (
          <div key={q.id} className="quest">
            <span style={{ minWidth: 150 }}>{q.label}</span>
            <Bar value={q.progress} max={q.target} kind="xp" />
            <span className="muted">
              {q.progress}/{q.target}
            </span>
            {q.claimed ? (
              <span className="muted">✔ Đã nhận</span>
            ) : (
              <button
                className="btn small"
                disabled={q.progress < q.target}
                onClick={() => claimQuest(q.id)}
              >
                +{q.xp} XP
              </button>
            )}
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 12 }}>Cốt truyện</h3>
      <div className="col">
        <div className="quest">
          {flags.gateOpened ? "✅" : "⬜"} Thuyết phục Sir Aldric mở cổng rừng
        </div>
        <div className="quest">
          {level >= 3 ? "✅" : "⬜"} Đạt cấp 3 để đủ sức thách đấu Vua Câm Lặng
        </div>
        <div className="quest">
          {flags.bossDefeated ? "✅" : "⬜"} Đánh bại Vua Câm Lặng trong Rừng Từ Vựng
        </div>
      </div>
    </Modal>
  );
}
