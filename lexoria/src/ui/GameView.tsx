import { useEffect, useRef, useState } from "react";
import { bus } from "../game/bus";
import { createGame, destroyGame } from "../game/createGame";
import type { MapId } from "../game/maps";
import type { NearbyInfo } from "../game/WorldScene";
import { useGame } from "../store/game";
import { useUi } from "../store/ui";
import { Battle } from "./Battle";
import { Bestiary } from "./Bestiary";
import { CharacterSheet } from "./CharacterSheet";
import { Dialogue } from "./Dialogue";
import { Forge } from "./Forge";
import { Hud } from "./Hud";
import { Quests } from "./Quests";

const MAP_NAMES: Record<MapId, string> = { town: "Thị trấn Khởi đầu", forest: "Rừng Từ Vựng" };

export function GameView() {
  const host = useRef<HTMLDivElement>(null);
  const { overlay, open, close, toasts } = useUi();
  const [nearby, setNearby] = useState<NearbyInfo | null>(null);
  const [mapId, setMapId] = useState<MapId>("town");

  useEffect(() => {
    useGame.getState().ensureToday();
    const game = createGame(host.current!);
    bus.on("nearby", setNearby);
    bus.on("map", setMapId);
    return () => {
      bus.off("nearby", setNearby);
      bus.off("map", setMapId);
      destroyGame(game);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typing) return;
      const current = useUi.getState().overlay;
      if (e.key === "Escape" && current && current.type !== "battle") close();
      if (current) return;
      const k = e.key.toLowerCase();
      if (k === "b") open({ type: "bestiary" });
      if (k === "q") open({ type: "quests" });
      if (k === "c") open({ type: "character" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div className="game-root">
      <div className="game-canvas" ref={host} />
      <Hud mapName={MAP_NAMES[mapId]} />

      {nearby && !overlay && (
        <div className="nearby">
          <span>
            <kbd>E</kbd> {nearby.label}
          </span>
          <button className="btn small" onClick={() => bus.emit("interact")}>
            OK
          </button>
        </div>
      )}

      {overlay?.type === "dialogue" && <Dialogue key={overlay.npcId} npcId={overlay.npcId} />}
      {overlay?.type === "battle" && <Battle key={overlay.enemyId} {...overlay} />}
      {overlay?.type === "bestiary" && <Bestiary />}
      {overlay?.type === "forge" && <Forge />}
      {overlay?.type === "quests" && <Quests />}
      {overlay?.type === "character" && <CharacterSheet />}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
