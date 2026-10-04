"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";

// Sino com contador ao vivo: quando chega notificação nova, aparece um aviso na tela.
export default function LiveBell({ userId, unread }: { userId: string; unread: number }) {
  const [n, setN] = useState(unread);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  const router = useRouter();
  useEffect(() => setN(unread), [unread]);
  useEffect(() => {
    if (!userId) return;
    const sb = createClient();
    const ch = sb.channel(`notif-${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p: any) => {
      setN((x) => x + 1); setToast({ id: p.new.id, text: p.new.text });
      setTimeout(() => setToast(null), 7000);
    }).subscribe();
    const t = setInterval(async () => { const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null); if (typeof count === "number") setN(count); }, 60000);
    return () => { sb.removeChannel(ch); clearInterval(t); };
  }, [userId]);
  return (<>
    <Link className="icon-btn" href="/notificacoes" aria-label={`Notificações${n ? `: ${n} novas` : ""}`}><Icon name="bell" />{n ? <span className="dot">{n > 99 ? "99+" : n}</span> : null}</Link>
    {toast ? <div className="toast" role="status"><Icon name="bell" /><a href={`/n/${toast.id}`} onClick={() => { setToast(null); setTimeout(() => router.refresh(), 300); }}>{toast.text}</a><button className="link-btn" onClick={() => setToast(null)} aria-label="Fechar">×</button></div> : null}
  </>);
}
