import { GoogleAnalytics } from "@next/third-parties/google";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/layouts/footer/footer";
import { env } from "@/lib/env";

/**
 * 開発者向けのフル幅レイアウト。
 * サイト標準の MainLayout はモバイルファーストの1カラム（max-w-700px）だが、
 * APIリファレンス等のドキュメントは横幅を要するため制約なしで表示する。
 */
export default function DevelopersGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      {/* 計測IDを設定したときだけ読み込む（未設定なら Google に何も送らない） */}
      {env.analytics.gaTrackingId && (
        <GoogleAnalytics gaId={env.analytics.gaTrackingId} />
      )}
      <Header />
      {/* Team Mirai デザインシステム準拠: 白を基調のキャンバスにする */}
      <main className="min-h-dvh bg-white">{children}</main>
      <Footer />
    </>
  );
}
