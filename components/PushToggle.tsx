"use client";
import { useEffect, useState } from "react";
import { pushKey, savePushSub, removePushSub } from "@/app/(app)/push-actions";

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

// Botão para receber as notificações da plataforma na tela do celular (ou do computador).
export default function PushToggle({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<"loading" | "unsupported" | "ios-install" | "off" | "on" | "denied">("loading");
  const [msg, setMsg] = useState("");
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(localStorage.getItem("cx-push-hide") === "1"); } catch {} }, []);
  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState(ios && !standalone ? "ios-install" : "unsupported"); return; }
      if (Notification.permission === "denied") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);
  async function enable() {
    setMsg("Ativando…");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); setMsg(""); return; }
      const k: any = await pushKey();
      if (k.error) { setMsg(k.error); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) });
      const j: any = sub.toJSON();
      const r: any = await savePushSub({ endpoint: j.endpoint, keys: j.keys }, navigator.userAgent);
      if (r.error) { setMsg(r.error); return; }
      setState("on"); setMsg("Pronto! Você vai receber as notificações neste aparelho.");
    } catch (e: any) { setMsg("Não foi possível ativar: " + (e?.message || "tente de novo")); }
  }
  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await removePushSub(sub.endpoint); await sub.unsubscribe(); }
    setState("off"); setMsg("Notificações desativadas neste aparelho.");
  }
  if (state === "loading") return null;
  if (compact && !["off", "ios-install"].includes(state)) return null;
  if (compact && hidden) return null;
  return (
    <div className="notice info" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        {state === "on" ? "🔔 Notificações ativadas neste aparelho." : state === "denied" ? "As notificações foram bloqueadas neste aparelho. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço) e volte aqui." : state === "ios-install" ? "No iPhone: toque em Compartilhar ⬆️ e depois em “Adicionar à Tela de Início”. Abra a Conecta pelo ícone e ative as notificações aqui." : state === "unsupported" ? "Este navegador não recebe notificações. Use Chrome, Safari (iPhone com o app na Tela de Início) ou Edge." : "Receba as notificações da Conecta na tela do celular, mesmo com o app fechado."}
        {msg ? <><br /><b>{msg}</b></> : null}
      </span>
      {compact ? <button className="link-btn small" onClick={() => { setHidden(true); try { localStorage.setItem("cx-push-hide", "1"); } catch {} }}>Agora não</button> : null}
      {state === "off" ? <button className="btn btn-primary btn-sm" onClick={enable}>Ativar notificações no celular</button> : state === "on" && !compact ? <button className="btn btn-ghost btn-sm" onClick={disable}>Desativar neste aparelho</button> : null}
    </div>
  );
}
