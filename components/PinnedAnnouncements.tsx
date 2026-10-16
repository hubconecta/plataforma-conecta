// Avisos fixados no início (Clube e Portal) para quem recebeu.
export default async function PinnedAnnouncements({ supabase, userId }: { supabase: any; userId: string }) {
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const { data: rec, error } = await supabase.from("announcement_recipients").select("announcement_id").eq("profile_id", userId);
  if (error || !rec?.length) return null;
  const { data } = await supabase.from("announcements").select("id,title,body,button_label,button_url,pinned_until").in("id", rec.map((r: any) => r.announcement_id)).gte("pinned_until", today).order("created_at", { ascending: false }).limit(3);
  if (!data?.length) return null;
  return <>{data.map((a: any) => (
    <div key={a.id} className="card ann-pin"><span className="eyebrow">📢 Aviso da Conecta</span><h2 style={{ margin: "4px 0 6px" }}>{a.title}</h2>
      {a.body ? <p className="small" style={{ whiteSpace: "pre-wrap" }}>{a.body.length > 280 ? a.body.slice(0, 280) + "…" : a.body}</p> : null}
      <div className="actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>{a.button_url ? <a className="btn btn-primary btn-sm" href={a.button_url} target={a.button_url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">{a.button_label || "Abrir"}</a> : null}<a className="btn btn-ghost btn-sm" href={`/aviso/${a.id}`}>Ver aviso</a></div>
    </div>))}</>;
}
