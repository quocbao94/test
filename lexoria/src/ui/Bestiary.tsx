import { useState } from "react";
import { TOPICS, wordsOfTopic, type TopicId } from "../content";
import { isDue, mastery, MASTERY_LABEL } from "../lib/srs";
import { useGame } from "../store/game";
import { useUi } from "../store/ui";
import { Modal } from "./Modal";
import { speak } from "./speech";

export function Bestiary() {
  const close = useUi((u) => u.close);
  const cards = useGame((s) => s.cards);
  const [topic, setTopic] = useState<TopicId>("environment");
  const [selected, setSelected] = useState<string | null>(null);

  const words = wordsOfTopic(topic);
  const found = words.filter((w) => cards[w.id]).length;
  const sel = words.find((w) => w.id === selected);
  const selCard = sel && cards[sel.id];

  return (
    <Modal onClose={close} wide>
      <h2>📖 Sổ từ (Bestiary)</h2>
      <p className="muted">
        Mỗi từ là một quái vật bạn đã gặp. Viền đỏ = sắp quên, cần săn lại trong Rừng Từ Vựng (quái
        có dấu ❗).
      </p>
      <div className="tabs">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            className={`tab ${t.id === topic ? "active" : ""}`}
            onClick={() => {
              setTopic(t.id);
              setSelected(null);
            }}
          >
            {t.name} ({wordsOfTopic(t.id).filter((w) => cards[w.id]).length}/
            {wordsOfTopic(t.id).length})
          </button>
        ))}
      </div>

      {sel && selCard && (
        <div className="word-detail col">
          <div className="row">
            <h3 style={{ margin: 0 }}>{sel.word}</h3>
            <span>
              {sel.ipa} · {sel.pos}
            </span>
            <button className="btn small" onClick={() => speak(sel.word)}>
              🔊
            </button>
            <span className="spacer" />
            <span>{MASTERY_LABEL[mastery(selCard)]}</span>
          </div>
          <div>
            <b>{sel.vi}</b>
          </div>
          <div>
            “{sel.example}”{" "}
            <button className="btn small ghost" onClick={() => speak(sel.example)}>
              🔊
            </button>
          </div>
          <div>
            Collocation: <i>{sel.collocation}</i>
          </div>
          <div className="muted">
            Đúng {selCard.correct} · Sai {selCard.wrong} · Ôn lại:{" "}
            {new Date(selCard.due).toLocaleString()}
          </div>
        </div>
      )}

      <p className="muted">
        Đã phát hiện {found}/{words.length} từ
      </p>
      <div className="word-grid">
        {words.map((w) => {
          const c = cards[w.id];
          if (!c)
            return (
              <div key={w.id} className="word-card unknown">
                ???
              </div>
            );
          return (
            <button
              key={w.id}
              className={`word-card ${c.reps > 0 && isDue(c) ? "due" : ""}`}
              onClick={() => setSelected(w.id)}
            >
              <b>{w.word}</b>
              <div className="muted">{MASTERY_LABEL[mastery(c)]}</div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
