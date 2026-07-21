"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Tracks how many signed-in users currently have the app open, via a shared
// Supabase Realtime presence channel (no DB table involved — presence is
// pure in-memory broadcast between connected clients).
export function usePresence(userId: string, userName: string): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("presence:online", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userName, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userName]);

  return count;
}
