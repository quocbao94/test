import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { newerSave, pullRemote, pushSnapshot } from "../lib/sync";
import { toSave, useGame } from "../store/game";
import { useUi } from "../store/ui";

interface AuthState {
  session: Session | null;
  syncing: boolean;
  lastSync: string | null;
  error: string | null;
}

export const useAuth = create<AuthState>()(() => ({
  session: null,
  syncing: false,
  lastSync: null,
  error: null,
}));

const PUSH_DEBOUNCE_MS = 3000;

/** Keeps the local save mirrored to Supabase while logged in. Mount once. */
export function useCloudSync() {
  useEffect(() => {
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ready = false;

    const push = async () => {
      const userId = useAuth.getState().session?.user.id;
      if (!userId) return;
      try {
        useAuth.setState({ syncing: true });
        await pushSnapshot(userId, toSave(useGame.getState()));
        useAuth.setState({ syncing: false, lastSync: new Date().toISOString(), error: null });
      } catch (e) {
        useAuth.setState({ syncing: false, error: (e as Error).message });
      }
    };

    const onLogin = async (session: Session) => {
      try {
        useAuth.setState({ syncing: true });
        const remote = await pullRemote(session.user.id);
        const local = toSave(useGame.getState());
        if (newerSave(local, remote) === "remote" && remote) {
          useGame.getState().loadSave(remote);
          useGame.getState().ensureToday();
          useUi.getState().toast("☁️ Đã tải dữ liệu từ đám mây");
        }
        ready = true;
        await push();
      } catch (e) {
        useAuth.setState({ syncing: false, error: (e as Error).message });
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      useAuth.setState({ session: data.session });
      if (data.session) onLogin(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      useAuth.setState({ session });
      if (event === "SIGNED_IN" && session) onLogin(session);
      if (event === "SIGNED_OUT") ready = false;
    });
    const unsubStore = useGame.subscribe((s, prev) => {
      if (!ready || s.updatedAt === prev.updatedAt) return;
      clearTimeout(timer);
      timer = setTimeout(push, PUSH_DEBOUNCE_MS);
    });

    return () => {
      sub.subscription.unsubscribe();
      unsubStore();
      clearTimeout(timer);
    };
  }, []);
}
