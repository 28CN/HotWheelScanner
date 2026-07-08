"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Star, History } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "扫描", icon: Camera },
  { href: "/wishlist", label: "心愿单", icon: Star },
  { href: "/history", label: "历史", icon: History },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-zinc-800 bg-zinc-950 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "text-amber-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
