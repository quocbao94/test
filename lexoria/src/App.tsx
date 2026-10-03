import { lazy, Suspense } from "react";
import { useGame } from "./store/game";
import { useCloudSync } from "./ui/auth";
import { CharacterCreate } from "./ui/CharacterCreate";

// Phaser is ~1 MB — only load it once there is a character to play
const GameView = lazy(() => import("./ui/GameView").then((m) => ({ default: m.GameView })));

export default function App() {
  const hasCharacter = useGame((s) => !!s.profile);
  useCloudSync();
  if (!hasCharacter) return <CharacterCreate />;
  return (
    <Suspense fallback={<div className="screen-center subtitle">Đang mở cổng Lexoria…</div>}>
      <GameView />
    </Suspense>
  );
}
