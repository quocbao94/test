import type { ReactNode } from "react";

export function Modal({
  children,
  onClose,
  wide,
}: {
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
}) {
  return (
    <div className="overlay" onPointerDown={(e) => e.stopPropagation()}>
      <div
        className="panel modal"
        style={wide ? { width: "min(900px, 100%)" } : undefined}
        role="dialog"
      >
        {onClose && (
          <button className="btn small ghost modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function Bar({
  value,
  max,
  kind,
}: {
  value: number;
  max: number;
  kind: "hp" | "xp" | "timer";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`bar ${kind}`}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}
