"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";

type Item = { key: string; label: string; icon: string; href: string; soon?: boolean; sens?: boolean };
type Group = [string, Item[]];

export default function Sidebar({ groups, env, userName, userLabel, bottom, avatar, star, profileHref }: { groups: Group[]; env: string; userName: string; userLabel: string; bottom: Item[]; avatar?: string; star?: string; profileHref?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const h = () => setOpen(true); window.addEventListener("cx-menu", h); return () => window.removeEventListener("cx-menu", h); }, []);
  const all = [...groups.flatMap((g) => g[1]), ...bottom];
  const best = all.filter((i) => path === i.href || path.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
  const active = (href: string) => !!best && best.href === href;
  const initials = userName.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <>
      <aside className={`side ${open ? "open" : ""}`} aria-label="Menu principal">
        <div className="side-top">
          <div className="logo-crop" style={{ ["--w" as any]: "190px" }}><img src="/logo-conecta.png" alt="Conecta" /></div>
          <button className="icon-btn only-m" style={{ background: "#111", borderColor: "#222", color: "#fff" }} onClick={() => setOpen(false)} aria-label="Fechar menu"><Icon name="x" /></button>
        </div>
        <span className="env">{env}</span>
        <nav>
          {groups.map(([h, items]) => (
            <div className="nav-g" key={h}>
              <div className="nav-h">{h}</div>
              {items.map((m) => (
                <Link key={m.key} href={m.href} className={`nav-i ${active(m.href) ? "on" : ""}`} title={m.label}>
                  <Icon name={m.icon} />
                  <span>{m.label}</span>
                  {m.soon ? <em className="soon" style={{ fontStyle: "normal" }}>breve</em> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-user">
          <Link href={profileHref || "#"} style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }} title="Meu perfil">
            <span className="av-wrap">{avatar ? <img className="av" src={avatar} alt="" style={{ width: 34, height: 34, objectFit: "cover" }} /> : <span className="av dark" aria-hidden="true">{initials}</span>}{star ? <span className="av-star" style={{ background: star, width: 15, height: 15, fontSize: 9, boxShadow: "0 0 0 2px #0B0B0C" }}>★</span> : null}</span>
            <div className="who"><b>{userName}</b><span>{userLabel}</span></div>
          </Link>
          <form action="/auth/signout" method="post"><button title="Sair" aria-label="Sair"><Icon name="logout" /></button></form>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <nav className="bnav" aria-label="Navegação rápida">
        {bottom.map((m) => (
          <Link key={m.key} href={m.href} className={active(m.href) ? "on" : ""} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 2px", fontSize: 10.5, fontWeight: 600, color: active(m.href) ? "var(--pink-ink)" : "var(--muted)", textDecoration: "none" }}>
            <Icon name={m.icon} /><span>{m.label.replace("Dashboard operacional", "Início").replace("Visão CEO", "CEO")}</span>
          </Link>
        ))}
        <button onClick={() => setOpen(true)}><Icon name="menu" /><span>Mais</span></button>
      </nav>
    </>
  );
}
