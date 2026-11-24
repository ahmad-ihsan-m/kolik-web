"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Ringkasan kandang", icon: "▦" },
  { href: "/kuda", label: "Detail kuda", icon: "📈" },
  { href: "/demo", label: "Demo: suntik kolik", icon: "💉" },
  { href: "/klinis", label: "Pemeriksaan klinis", icon: "🩺" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="menu">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className={path === it.href ? "active" : ""}>
          <span className="ico">{it.icon}</span>{it.label}
        </Link>
      ))}
    </nav>
  );
}
