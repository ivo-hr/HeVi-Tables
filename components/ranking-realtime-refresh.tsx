"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function RankingRealtimeRefresh({
  groupId,
  tableIds
}: {
  groupId: string;
  tableIds: string[];
}) {
  const router = useRouter();
  const tableIdsKey = tableIds.join(",");

  useEffect(() => {
    if (!tableIdsKey) return;
    const supabase = createClient();
    const channel = supabase.channel(`ranking:${groupId}`);
    for (const tableId of tableIdsKey.split(",")) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tabla_filas",
          filter: `table_id=eq.${tableId}`
        },
        () => router.refresh()
      );
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, router, tableIdsKey]);

  return null;
}
