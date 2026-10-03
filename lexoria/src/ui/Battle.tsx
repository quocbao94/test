import { useCallback, useEffect, useMemo, useState } from "react";
import { TOPICS, WORDS_BY_ID, wordsOfTopic, type TopicId } from "../content";
import { bus } from "../game/bus";
import { spriteUrl } from "../game/createGame";
import { playerTextureKey } from "../game/textures";
import {
  ANSWER_TIME_LIMIT_MS,
  CRIT_WINDOW_MS,
  enemyFor,
  maxHpFor,
  resolveAnswer,
  type AttackResult,
} from "../lib/battle";
import { XP } from "../lib/progression";
import { makeQuestion, type Question } from "../lib/questions";
import { pickBattleWords } from "../lib/selection";
import { attackBonus, useGame } from "../store/game";
import { useUi } from "../store/ui";
import { Bar, Modal } from "./Modal";
import { rewardXp } from "./rewards";
import { speak } from "./speech";

type Phase = "question" | "reveal" | "won" | "lost";

const BOSS_NAME = "👑 Vua Câm Lặng";

export function Battle({
  enemyId,
  topic,
  isBoss,
}: {
  enemyId: string;
  topic: TopicId;
  isBoss: boolean;
}) {
  const close = useUi((u) => u.close);
  const toast = useUi((u) => u.toast);
  const game = useGame();
  const profile = game.profile!;

  const enemy = useMemo(() => {
    const t = TOPICS.find((x) => x.id === topic)!;
    return enemyFor(useGame.getState().level, isBoss, isBoss ? BOSS_NAME : t.monster);
  }, [topic, isBoss]);

  const questions = useMemo<Question[]>(() => {
    const words = pickBattleWords(
      isBoss ? "all" : topic,
      useGame.getState().cards,
      enemy.questionCount,
      Math.random,
    );
    return words.map((w) => makeQuestion(w, wordsOfTopic(w.topic), Math.random));
  }, [topic, isBoss, enemy.questionCount]);

  const [idx, setIdx] = useState(0);
  const [enemyHp, setEnemyHp] = useState(enemy.hp);
  const [combo, setCombo] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [startedAt, setStartedAt] = useState(() => performance.now());
  const [now, setNow] = useState(() => performance.now());
  const [chosen, setChosen] = useState<number | null>(null);
  const [last, setLast] = useState<AttackResult | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const q = questions[idx % questions.length];
  const word = WORDS_BY_ID[q.wordId];
  const elapsed = now - startedAt;

  const answer = useCallback(
    (choice: number) => {
      if (phase !== "question") return;
      const elapsedMs = performance.now() - startedAt;
      const correct = choice === q.answerIndex;
      const s = useGame.getState();
      const r = resolveAnswer(
        { correct, elapsedMs, combo, weaponBonus: attackBonus(s), level: s.level },
        enemy.attack,
      );
      s.recordAnswer(
        q.wordId,
        correct && elapsedMs <= ANSWER_TIME_LIMIT_MS,
        elapsedMs <= CRIT_WINDOW_MS,
      );
      if (correct && elapsedMs <= ANSWER_TIME_LIMIT_MS) rewardXp(XP.correctAnswer, "battle");
      if (r.damageToPlayer) s.setHp(s.hp - r.damageToPlayer);
      setEnemyHp((hp) => Math.max(0, hp - r.damageToEnemy));
      setCombo(r.nextCombo);
      setChosen(choice);
      setLast(r);
      setStats((st) => ({ correct: st.correct + (r.damageToEnemy ? 1 : 0), total: st.total + 1 }));
      setPhase("reveal");
    },
    [phase, startedAt, q, combo, enemy.attack],
  );

  const next = useCallback(() => {
    if (phase !== "reveal") return;
    if (enemyHp <= 0) {
      setPhase("won");
      const s = useGame.getState();
      rewardXp(isBoss ? XP.bossDefeated : XP.enemyDefeated, "battle");
      s.progressQuest("defeat");
      if (isBoss) {
        s.setFlag("bossDefeated", true);
        toast("🏆 Bạn đã phá được Lời nguyền của Rừng Từ Vựng!");
      }
      return;
    }
    if (useGame.getState().hp <= 0) {
      setPhase("lost");
      return;
    }
    setIdx((i) => i + 1);
    setChosen(null);
    setLast(null);
    setStartedAt(performance.now());
    setPhase("question");
  }, [phase, enemyHp, isBoss, toast]);

  // Timer
  useEffect(() => {
    if (phase !== "question") return;
    const t = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === "question" && elapsed > ANSWER_TIME_LIMIT_MS) answer(-1);
  }, [elapsed, phase, answer]);

  // Correct answers auto-advance; wrong ones wait so the player can read the explanation
  useEffect(() => {
    if (phase === "reveal" && last && last.damageToEnemy > 0) {
      const t = setTimeout(next, 1300);
      return () => clearTimeout(t);
    }
  }, [phase, last, next]);

  // Keyboard: 1-4 to answer, Enter to continue
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (phase === "question" && n >= 1 && n <= q.options.length) answer(n - 1);
      if (phase === "reveal" && (e.key === "Enter" || e.key === " ")) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, q, answer, next]);

  const finish = (outcome: "won" | "lost" | "fled") => {
    if (outcome === "won") bus.emit("enemy-defeated", enemyId);
    if (outcome === "fled") bus.emit("player-fled", enemyId);
    if (outcome === "lost") {
      useGame.getState().healFull();
      bus.emit("player-defeated");
      toast("💤 Bạn được đưa về thị trấn và hồi phục.");
    }
    close();
  };

  const maxHp = maxHpFor(game.level);
  const enemyKey = isBoss ? "boss" : `mon-${topic}`;

  return (
    <Modal>
      <div className="battle">
        <div className="battle-field">
          <div className="fighter">
            <div className="dmg">{last?.damageToPlayer ? `-${last.damageToPlayer}` : ""}</div>
            <img
              src={spriteUrl(playerTextureKey(profile.cls))}
              alt=""
              className={last?.damageToPlayer ? "hit" : ""}
              key={`p${idx}${phase}`}
            />
            <span className="name">{profile.name}</span>
            <Bar value={game.hp} max={maxHp} kind="hp" />
          </div>
          <div className="combo">{combo >= 2 ? `COMBO x${combo}` : "VS"}</div>
          <div className={`fighter ${isBoss ? "boss" : ""}`}>
            <div className={`dmg ${last?.crit ? "crit" : ""}`}>
              {last?.damageToEnemy ? `${last.crit ? "CHÍ MẠNG! " : ""}-${last.damageToEnemy}` : ""}
            </div>
            <img
              src={spriteUrl(enemyKey)}
              alt=""
              className={last?.damageToEnemy ? "hit" : ""}
              key={`e${idx}${phase}`}
            />
            <span className="name">{enemy.name}</span>
            <Bar value={enemyHp} max={enemy.hp} kind="hp" />
          </div>
        </div>

        {phase === "won" && (
          <div className="col">
            <h2>🎉 Chiến thắng!</h2>
            <p>
              Đúng {stats.correct}/{stats.total} câu. Các từ đã được ghi vào Sổ từ và sẽ quay lại
              đúng lúc bạn sắp quên.
            </p>
            <button className="btn primary" onClick={() => finish("won")}>
              Tiếp tục
            </button>
          </div>
        )}

        {phase === "lost" && (
          <div className="col">
            <h2>💀 Bạn đã gục ngã…</h2>
            <p>Đừng nản! Những từ trả lời sai sẽ xuất hiện lại sớm để bạn ôn.</p>
            <button className="btn primary" onClick={() => finish("lost")}>
              Về thị trấn
            </button>
          </div>
        )}

        {(phase === "question" || phase === "reveal") && (
          <>
            <Bar
              value={phase === "question" ? ANSWER_TIME_LIMIT_MS - elapsed : 0}
              max={ANSWER_TIME_LIMIT_MS}
              kind="timer"
            />
            <div className="question">{q.prompt}</div>
            {q.context && <div className="context">{q.context}</div>}
            <div className="options">
              {q.options.map((opt, i) => {
                const state =
                  phase === "reveal"
                    ? i === q.answerIndex
                      ? "correct"
                      : i === chosen
                        ? "wrong"
                        : ""
                    : "";
                return (
                  <button
                    key={i}
                    className={`option ${state}`}
                    disabled={phase !== "question"}
                    onClick={() => answer(i)}
                  >
                    <span className="key">{i + 1}.</span> {opt}
                  </button>
                );
              })}
            </div>

            {phase === "reveal" && (
              <div className="reveal col">
                <div className="row">
                  <b>
                    {last?.damageToEnemy
                      ? "✅ Chính xác!"
                      : chosen === -1
                        ? "⏰ Hết giờ!"
                        : "❌ Chưa đúng"}
                  </b>
                  <span>
                    <b>{word.word}</b> {word.ipa} ({word.pos}) — {word.vi}
                  </span>
                  <button
                    className="btn small"
                    onClick={() => speak(word.word)}
                    aria-label="Nghe phát âm"
                  >
                    🔊
                  </button>
                </div>
                <span className="muted">
                  “{word.example}” · Collocation: <i>{word.collocation}</i>
                </span>
                {!last?.damageToEnemy && (
                  <button className="btn" onClick={next}>
                    Tiếp (Enter)
                  </button>
                )}
              </div>
            )}

            {phase === "question" && (
              <div className="row">
                <span className="muted">Trả lời trong 4 giây để gây chí mạng · phím 1–4</span>
                <span className="spacer" />
                <button className="btn small ghost" onClick={() => finish("fled")}>
                  🏃 Bỏ chạy
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
