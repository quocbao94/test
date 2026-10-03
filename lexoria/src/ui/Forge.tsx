import { useEffect, useState } from "react";
import { WRITING_PROMPTS } from "../content";
import { AiError, aiReady, gradeWriting } from "../lib/ai";
import { XP } from "../lib/progression";
import {
  countWords,
  forgeWeapon,
  RARITY_LABEL,
  type Weapon,
  type WritingGrade,
} from "../lib/writing";
import { useGame } from "../store/game";
import { useUi } from "../store/ui";
import { Modal } from "./Modal";
import { rewardXp } from "./rewards";

const MIN_WORDS = 120;
const MAX_WORDS = 600;

const CRITERIA: [keyof WritingGrade, string][] = [
  ["task_response", "Task Response"],
  ["coherence_cohesion", "Coherence & Cohesion"],
  ["lexical_resource", "Lexical Resource"],
  ["grammar", "Grammar Range & Accuracy"],
];

export function Forge() {
  const close = useUi((u) => u.close);
  const [promptId, setPromptId] = useState(WRITING_PROMPTS[0].id);
  const [essay, setEssay] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ grade: WritingGrade; weapon: Weapon } | null>(null);

  useEffect(() => {
    aiReady().then(setOnline);
  }, []);

  const prompt = WRITING_PROMPTS.find((p) => p.id === promptId)!;
  const words = countWords(essay);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const grade = await gradeWriting(promptId, essay);
      const weapon = forgeWeapon(grade.overall, promptId);
      const s = useGame.getState();
      s.addWeapon(weapon);
      s.addMistakes(grade.corrections.map((c) => `${c.original} → ${c.improved}`));
      rewardXp(Math.round(XP.writingPerBand * grade.overall), "writing");
      setResult({ grade, weapon });
    } catch (e) {
      setError(e instanceof AiError || e instanceof Error ? e.message : "Không chấm được bài.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={close} wide>
      <h2>🔥 Lò rèn Văn chương</h2>
      <p className="muted">
        Viết bài IELTS Writing Task 2 — giám khảo AI chấm theo 4 tiêu chí. Band càng cao, vũ khí rèn
        ra càng mạnh.
      </p>

      {result ? (
        <GradeView
          {...result}
          onAgain={() => {
            setResult(null);
            setEssay("");
          }}
        />
      ) : (
        <div className="col">
          <label className="field">
            Đề bài
            <select value={promptId} onChange={(e) => setPromptId(e.target.value)}>
              {WRITING_PROMPTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prompt.slice(0, 70)}…
                </option>
              ))}
            </select>
          </label>
          <div className="context">{prompt.prompt}</div>
          <textarea
            className="essay"
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder="Write at least 250 words…"
            disabled={busy}
          />
          <div className="row">
            <span className="muted">
              {words} từ {words < 250 && "(IELTS yêu cầu ≥ 250)"}
            </span>
            <span className="spacer" />
            <button
              className="btn primary"
              onClick={submit}
              disabled={!online || busy || words < MIN_WORDS || words > MAX_WORDS}
            >
              {busy ? "⚒️ Đang rèn…" : "⚒️ Rèn vũ khí"}
            </button>
          </div>
          {online === false && (
            <span className="muted">
              🔌 Cần đăng nhập (và máy chủ đã cấu hình) để giám khảo AI chấm bài.
            </span>
          )}
          {words > 0 && words < MIN_WORDS && (
            <span className="muted">Cần ít nhất {MIN_WORDS} từ để rèn.</span>
          )}
          {error && <span style={{ color: "var(--bad)" }}>{error}</span>}
        </div>
      )}
      <Armory />
    </Modal>
  );
}

function GradeView({
  grade,
  weapon,
  onAgain,
}: {
  grade: WritingGrade;
  weapon: Weapon;
  onAgain: () => void;
}) {
  return (
    <div className="col">
      <div className={`weapon ${weapon.rarity}`}>
        ⚔️ Bạn đã rèn được <b>{weapon.name}</b> — {RARITY_LABEL[weapon.rarity]}, +{weapon.bonus} sát
        thương
      </div>
      <h3>Band tổng: {grade.overall}</h3>
      <div className="bands">
        {CRITERIA.map(([key, label]) => {
          const c = grade[key] as { band: number; comment: string };
          return (
            <div className="band" key={key}>
              <div className="muted">{label}</div>
              <b>{c.band}</b>
              <div>{c.comment}</div>
            </div>
          );
        })}
      </div>
      {grade.corrections.length > 0 && (
        <div className="feedback">
          <b>Sửa lỗi</b>
          <ul>
            {grade.corrections.map((c, i) => (
              <li key={i}>
                <span className="strike">{c.original}</span> →{" "}
                <span className="fix">{c.improved}</span>
                <div className="muted">{c.explanation}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {grade.band_upgrades.length > 0 && (
        <div className="feedback">
          <b>Gợi ý nâng band</b>
          <ul>
            {grade.band_upgrades.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}
      <button className="btn" onClick={onAgain}>
        Viết bài khác
      </button>
    </div>
  );
}

export function Armory() {
  const { weapons, equippedWeaponId, equipWeapon } = useGame();
  if (!weapons.length) return null;
  return (
    <div className="col" style={{ marginTop: 12 }}>
      <h3>🗡️ Kho vũ khí</h3>
      {weapons.map((w) => (
        <div key={w.id} className={`weapon ${w.rarity} row`}>
          <span>
            <b>{w.name}</b> · {RARITY_LABEL[w.rarity]} · +{w.bonus}
          </span>
          <span className="spacer" />
          {w.id === equippedWeaponId ? (
            <span className="muted">Đang trang bị</span>
          ) : (
            <button className="btn small" onClick={() => equipWeapon(w.id)}>
              Trang bị
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
