"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

type Item = { key: string; label: string; href: string };

export default function TopBar({ env, items, unread }: { env: string; items: Item[]; unread: number }) {
  const path = usePathname();
  const cur = items.filter((i) => path === i.href || path.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <header className="top">
      <button className="icon-btn only-m" onClick={() => window.dispatchEvent(new Event("cx-menu"))} aria-label="Abrir menu"><Icon name="menu" /></button>
      <img className="symbol only-m" src="/simbolo-conecta.png" alt="Conecta" />
      <div className="crumb"><span className="s only-d">{env} /</span><span className="t">{cur?.label || ""}</span></div>
      <Link className="icon-btn" href="/notificacoes" aria-label="Notificações"><Icon name="bell" />{unread ? <span className="dot">{unread}</span> : null}</Link>
    </header>
  );
}
