import { useEffect, useRef, useState } from "react";
import { NPCS, type NpcId } from "../content/npcs";
import { spriteUrl } from "../game/createGame";
import {
  AiError,
  aiReady,
  npcFeedback,
  npcReply,
  offlineGoalCheck,
  type ChatTurn,
  type NpcFeedback,
} from "../lib/ai";
import { XP } from "../lib/progression";
import { useGame } from "../store/game";
import { useUi } from "../store/ui";
import { Modal } from "./Modal";
import { rewardXp } from "./rewards";
import { canListen, listenOnce, speak } from "./speech";

const MAX_TURNS = 12;
const MAX_CHARS = 400;

export function Dialogue({ npcId }: { npcId: NpcId }) {
  const npc = NPCS[npcId];
  const close = useUi((u) => u.close);
  const toast = useUi((u) => u.toast);
  const gateOpened = useGame((s) => s.flags.gateOpened);
  const goal = npc.goal && !gateOpened ? npc.goal : undefined;

  const greeting =
    npcId === "guard" && gateOpened
      ? "The gate is open, Wordsmith. Good luck in the forest!"
      : npc.greeting;
  const [messages, setMessages] = useState<ChatTurn[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<NpcFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState<null | (() => void)>(null);
  const talked = useRef(false);
  const offlineIdx = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiReady().then(setOnline);
  }, []);
  useEffect(() => chatEnd.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const userTurns = messages.filter((m) => m.role === "user").length;

  const send = async () => {
    const text = input.trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    listening?.();
    setListening(null);
    setInput("");
    setError(null);
    const history: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    if (!talked.current) {
      talked.current = true;
      useGame.getState().progressQuest("talk");
    }

    if (!online) {
      const line = npc.offlineLines[offlineIdx.current++ % npc.offlineLines.length];
      setMessages([...history, { role: "assistant", content: line }]);
      return;
    }

    setBusy(true);
    try {
      setMessages([...history, { role: "assistant", content: "…" }]);
      const reply = await npcReply(npcId, history, (partial) =>
        setMessages([...history, { role: "assistant", content: partial }]),
      );
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(history);
      setError(e instanceof AiError ? e.message : "Không kết nối được tới NPC.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      let fb: NpcFeedback;
      if (online) {
        fb = await npcFeedback(npcId, messages);
      } else {
        const ok = goal ? offlineGoalCheck(messages) : true;
        fb = {
          goal_achieved: ok,
          goal_comment_vi: ok
            ? "Bạn đã đưa ra lý do rõ ràng. (Chấm offline đơn giản — đăng nhập để Claude nhận xét chi tiết.)"
            : "Hãy viết ít nhất 2 câu tiếng Anh có lý do (because, also, first…).",
          corrections: [],
          natural_phrases: [],
          vocab_suggestions: [],
        };
      }
      setFeedback(fb);
      const s = useGame.getState();
      if (fb.corrections.length)
        s.addMistakes(fb.corrections.map((c) => `${c.original} → ${c.improved}`));
      if (goal && fb.goal_achieved) {
        s.setFlag("gateOpened", true);
        rewardXp(XP.dialogueGoal, "dialogue");
        toast("🚪 Cổng Rừng Từ Vựng đã mở! Đi về phía đông.");
      } else if (!goal && userTurns >= 2) {
        rewardXp(10, "dialogue");
      }
    } catch (e) {
      setError(e instanceof AiError ? e.message : "Không lấy được nhận xét.");
    } finally {
      setBusy(false);
    }
  };

  const mic = () => {
    if (listening) {
      listening();
      setListening(null);
      return;
    }
    const stop = listenOnce((t) => setInput(t));
    setListening(() => stop);
  };

  return (
    <Modal onClose={close}>
      <div className="dialogue">
        <div className="dialogue-head">
          <img className="portrait" src={spriteUrl(`npc-${npcId}`)} alt="" />
          <div>
            <h2 style={{ margin: 0 }}>{npc.name}</h2>
            <div className="muted">
              {npc.title} ·{" "}
              {online === null ? "…" : online ? "🧠 Trò chuyện tự do (AI)" : "🔌 Offline"}
            </div>
          </div>
        </div>

        {goal && (
          <div className="goal">
            🎯 <b>Nhiệm vụ:</b> {goal.summaryVi}
          </div>
        )}

        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "me" : "npc"}`}>
              {m.content}
              {m.role === "assistant" && m.content !== "…" && (
                <button
                  className="btn small ghost"
                  onClick={() => speak(m.content)}
                  aria-label="Nghe"
                >
                  🔊
                </button>
              )}
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        {feedback ? (
          <FeedbackView fb={feedback} hasGoal={!!goal || (npcId === "guard" && gateOpened)} />
        ) : userTurns < MAX_TURNS ? (
          <div className="row">
            <input
              style={{
                flex: 1,
                minWidth: 0,
                padding: 8,
                border: "2px solid var(--border)",
                borderRadius: 4,
              }}
              value={input}
              maxLength={MAX_CHARS}
              placeholder="Type in English…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={busy}
              autoFocus
            />
            {canListen() && (
              <button className="btn small" onClick={mic} aria-label="Nói">
                {listening ? "⏹" : "🎤"}
              </button>
            )}
            <button className="btn small primary" onClick={send} disabled={busy || !input.trim()}>
              Gửi
            </button>
          </div>
        ) : (
          <div className="muted">Cuộc trò chuyện đã đủ dài — hãy xem nhận xét nhé.</div>
        )}

        {error && <div style={{ color: "var(--bad)" }}>{error}</div>}

        {!feedback && userTurns >= 1 && (goal || online) && (
          <button className="btn" onClick={finish} disabled={busy}>
            {goal ? "✋ Kết thúc & xem kết quả" : "📝 Nhận xét tiếng Anh của tôi"}
          </button>
        )}
      </div>
    </Modal>
  );
}

function FeedbackView({ fb, hasGoal }: { fb: NpcFeedback; hasGoal: boolean }) {
  return (
    <div className="feedback col">
      {hasGoal && (
        <b style={{ color: fb.goal_achieved ? "var(--good)" : "var(--bad)" }}>
          {fb.goal_achieved ? "✅ Hoàn thành nhiệm vụ!" : "❌ Chưa thuyết phục được"}
        </b>
      )}
      <span>{fb.goal_comment_vi}</span>
      {fb.corrections.length > 0 && (
        <>
          <b>Sửa lỗi</b>
          <ul>
            {fb.corrections.map((c, i) => (
              <li key={i}>
                <span className="strike">{c.original}</span> →{" "}
                <span className="fix">{c.improved}</span>
                <div className="muted">{c.explanation_vi}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      {fb.natural_phrases.length > 0 && (
        <>
          <b>Cách nói tự nhiên hơn</b>
          <ul>
            {fb.natural_phrases.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {fb.vocab_suggestions.length > 0 && (
        <>
          <b>Từ vựng band cao nên dùng</b>
          <ul>
            {fb.vocab_suggestions.map((v, i) => (
              <li key={i}>
                <b>{v.word}</b> — {v.meaning_vi}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
