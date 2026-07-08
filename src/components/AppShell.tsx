"use client";

import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto min-h-screen max-w-lg pb-24">{children}</div>
      <BottomNav />
    </>
  );
}
