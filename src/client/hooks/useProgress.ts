import { useEffect } from "react";
import { wsManager } from "../lib/ws";
import { useStore, type ProgressMessage } from "../store/lumen";

// Subscribes to the realtime progress stream and feeds the store.
export function useProgress() {
  const addProgress = useStore((s) => s.addProgress);

  useEffect(() => {
    wsManager.connect();

    const cleanup = wsManager.onMessage((data: unknown) => {
      const msg = data as
        | ProgressMessage
        | { type: "history"; messages: ProgressMessage[] };

      if (msg.type === "history") {
        for (const m of msg.messages) addProgress(m);
        return;
      }
      addProgress(msg);
    });

    return () => {
      cleanup();
      wsManager.disconnect();
    };
  }, [addProgress]);
}
