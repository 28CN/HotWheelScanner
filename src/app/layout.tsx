import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hot Wheels Scanner | 风火轮扫描器",
  description: "AI 视觉辅助风火轮收藏者线下淘货",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "风火轮扫描器",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-zinc-950 font-sans text-white antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
