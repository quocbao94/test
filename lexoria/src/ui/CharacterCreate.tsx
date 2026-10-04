import { useState } from "react";
import { CLASSES, type ClassId } from "../lib/classes";
import { useGame, type Exam } from "../store/game";
import { AuthPanel } from "./AuthPanel";

const IELTS_TARGETS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
const TOEIC_TARGETS = [450, 550, 650, 750, 850, 900, 990];

export function CharacterCreate() {
  const createCharacter = useGame((s) => s.createCharacter);
  const [name, setName] = useState("");
  const [cls, setCls] = useState<ClassId>("sage");
  const [exam, setExam] = useState<Exam>("ielts");
  const [target, setTarget] = useState(6.5);
  const [examDate, setExamDate] = useState("");

  const targets = exam === "ielts" ? IELTS_TARGETS : TOEIC_TARGETS;

  return (
    <div className="screen-center">
      <div style={{ width: "min(640px, 100%)" }}>
        <div className="title">LEXORIA</div>
        <div className="subtitle">Phá Lời nguyền Câm lặng — chinh phục IELTS/TOEIC</div>
        <div className="panel col" style={{ gap: 14 }}>
          <h2>Tạo nhân vật</h2>
          <label className="field">
            Tên Wordsmith
            <input
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Bảo"
            />
          </label>

          <div className="field">
            Chọn class
            <div className="class-grid">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  className={`class-card ${cls === c.id ? "selected" : ""}`}
                  onClick={() => setCls(c.id)}
                  aria-pressed={cls === c.id}
                >
                  <b>
                    {c.emoji} {c.name}
                  </b>
                  <div className="muted">{c.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <label className="field">
              Kỳ thi
              <select
                value={exam}
                onChange={(e) => {
                  const next = e.target.value as Exam;
                  setExam(next);
                  setTarget(next === "ielts" ? 6.5 : 750);
                }}
              >
                <option value="ielts">IELTS</option>
                <option value="toeic">TOEIC</option>
              </select>
            </label>
            <label className="field">
              Mục tiêu
              <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                {targets.map((t) => (
                  <option key={t} value={t}>
                    {exam === "ielts" ? `Band ${t}` : `${t} điểm`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Ngày thi (không bắt buộc)
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </label>
          </div>

          <button
            className="btn primary"
            disabled={!name.trim()}
            onClick={() =>
              createCharacter({ name: name.trim(), cls, exam, target, examDate: examDate || null })
            }
          >
            ⚔️ Bắt đầu phiêu lưu
          </button>

          <hr style={{ border: 0, borderTop: "2px dashed var(--panel-2)", width: "100%" }} />
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
