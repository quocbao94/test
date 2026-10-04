import { create } from "zustand";
import type { NpcId } from "../content/npcs";
import type { TopicId } from "../content";

export type Overlay =
  | { type: "dialogue"; npcId: NpcId }
  | { type: "battle"; enemyId: string; topic: TopicId; isBoss: boolean }
  | { type: "bestiary" }
  | { type: "forge" }
  | { type: "character" }
  | { type: "quests" };

interface UiState {
  overlay: Overlay | null;
  toasts: { id: number; text: string }[];
  open: (o: Overlay) => void;
  close: () => void;
  toast: (text: string) => void;
}

let toastId = 0;

export const useUi = create<UiState>()((set, get) => ({
  overlay: null,
  toasts: [],
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
  toast: (text) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3500);
  },
}));
