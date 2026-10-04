import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";
import { parseWritingGrade, type WritingGrade } from "./writing";
import type { NpcId } from "../content/npcs";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface NpcFeedback {
  goal_achieved: boolean;
  goal_comment_vi: string;
  corrections: { original: string; improved: string; explanation_vi: string }[];
  natural_phrases: string[];
  vocab_suggestions: { word: string; meaning_vi: string }[];
}

export class AiError extends Error {
  /** The server has no Claude key yet — fall back to offline behaviour. */
  constructor(
    message: string,
    readonly offline = false,
  ) {
    super(message);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) throw new AiError("Chưa cấu hình máy chủ — đang chạy chế độ offline.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AiError("Hãy đăng nhập để dùng tính năng AI.");
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
}

async function callFunction(name: string, body: unknown): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Lỗi máy chủ (${res.status})`;
    let code: string | undefined;
    try {
      const data = await res.json();
      msg = data.error ?? msg;
      code = data.code;
    } catch {
      /* not JSON */
    }
    throw new AiError(msg, code === "ai_disabled");
  }
  return res;
}

export async function aiReady(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Streams the NPC's reply; `onDelta` receives the text as it arrives. */
export async function npcReply(
  npcId: NpcId,
  messages: ChatTurn[],
  onDelta: (text: string) => void,
): Promise<string> {
  const res = await callFunction("npc-chat", { mode: "reply", npcId, messages });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    full += value;
    onDelta(full);
  }
  return full;
}

export async function npcFeedback(npcId: NpcId, messages: ChatTurn[]): Promise<NpcFeedback> {
  const res = await callFunction("npc-chat", { mode: "feedback", npcId, messages });
  return (await res.json()) as NpcFeedback;
}

export async function gradeWriting(promptId: string, essay: string): Promise<WritingGrade> {
  const res = await callFunction("grade-writing", { promptId, essay });
  return parseWritingGrade(await res.json());
}

/**
 * Offline stand-in for the guard's goal check: two English sentences with a reason.
 * Deliberately simple — real evaluation happens server-side with Claude.
 */
export function offlineGoalCheck(messages: ChatTurn[]): boolean {
  const text = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  const reasons = (
    text.match(/\b(because|so that|since|in order to|as|first|second|also)\b/gi) ?? []
  ).length;
  return words >= 15 && reasons >= 2;
}
