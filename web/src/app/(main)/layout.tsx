import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/layouts/footer/footer";
import { MainLayout } from "@/components/layouts/main-layout";
import { env } from "@/lib/env";
import { RubyfulInitializer } from "@/lib/rubyful";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <SpeedInsights />
      {/* 計測IDを設定したときだけ読み込む（未設定なら Google に何も送らない） */}
      {env.analytics.gaTrackingId && (
        <GoogleAnalytics gaId={env.analytics.gaTrackingId} />
      )}
      <RubyfulInitializer />

      <MainLayout header={<Header />} footer={<Footer />}>
        {children}
      </MainLayout>
    </>
  );
}
