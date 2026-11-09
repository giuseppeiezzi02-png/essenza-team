"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatData } from "@/lib/ads";
import { createClient } from "@/lib/supabase/client";
import type { Notifica } from "@/lib/types";

export default function Notifiche({ userId, notifiche }: { userId: string; notifiche: Notifica[] }) {
  const router = useRouter();
  const [segnando, setSegnando] = useState(false);
  const nonLette = notifiche.filter((n) => !n.letta).length;

  useEffect(() => {
    const supabase = createClient();
    const canale = supabase
      .channel(`notifiche-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifiche", filter: `consulente_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canale);
    };
  }, [userId, router]);

  async function segnaLette() {
    setSegnando(true);
    await createClient().rpc("segna_notifiche_lette");
    setSegnando(false);
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">
          Notifiche
          {nonLette > 0 && (
            <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">{nonLette}</span>
          )}
        </h2>
        {nonLette > 0 && (
          <button type="button" onClick={segnaLette} disabled={segnando} className="text-sm font-medium text-teal-700">
            Segna come lette
          </button>
        )}
      </div>
      {notifiche.length ? (
        <ul className="space-y-2">
          {notifiche.map((n) => (
            <li key={n.id}>
              <Link
                href="/dashboard/ads#lead"
                className={`block rounded-xl p-4 shadow-sm ring-1 ${
                  n.letta ? "bg-white ring-stone-200" : "bg-teal-50 ring-teal-200"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-stone-900">{n.titolo}</p>
                  <p className="shrink-0 text-xs text-stone-500">{formatData(n.created_at)}</p>
                </div>
                <p className="mt-1 text-sm text-stone-600">{n.messaggio}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-500">Nessuna notifica.</p>
      )}
    </section>
  );
}
