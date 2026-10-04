import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./auth";

export function AuthPanel() {
  const { session, syncing, lastSync, error } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!supabase) {
    return (
      <p className="muted">
        🔌 Chế độ offline: tiến độ lưu trong trình duyệt. NPC dùng lời thoại soạn sẵn; chấm bài viết
        bằng AI cần kết nối máy chủ.
      </p>
    );
  }

  if (session) {
    return (
      <div className="col">
        <div className="row">
          <span>☁️ {session.user.email}</span>
          <span className="spacer" />
          <button className="btn small" onClick={() => supabase!.auth.signOut()}>
            Đăng xuất
          </button>
        </div>
        <span className="muted">
          {syncing
            ? "Đang đồng bộ…"
            : lastSync
              ? `Đã đồng bộ lúc ${new Date(lastSync).toLocaleTimeString()}`
              : ""}
          {error && ` — Lỗi đồng bộ: ${error}`}
        </span>
      </div>
    );
  }

  const sendLink = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div className="col">
      <span className="muted">
        Đăng nhập để lưu tiến độ lên đám mây và trò chuyện với NPC bằng AI.
      </span>
      {sent ? (
        <span>📬 Đã gửi link đăng nhập tới {email}. Kiểm tra hộp thư nhé!</span>
      ) : (
        <div className="row">
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              minWidth: 180,
              padding: 8,
              border: "2px solid var(--border)",
              borderRadius: 4,
            }}
          />
          <button className="btn small" disabled={busy || !email.includes("@")} onClick={sendLink}>
            Gửi link
          </button>
          <button
            className="btn small"
            onClick={() =>
              supabase!.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin },
              })
            }
          >
            Google
          </button>
        </div>
      )}
      {err && <span style={{ color: "var(--bad)" }}>{err}</span>}
    </div>
  );
}
