"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getMainLayoutKind, isInterviewSection } from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * ヘッダー・本文・フッターの外枠。
 *
 * ヘッダーとフッターは常に画面幅いっぱいの帯にする。本文の組み方はページで
 * 変える（getMainLayoutKind）。
 *
 * - wide: 本文も画面幅いっぱい。最大幅はページ側で決める
 * - narrow: 従来の1カラム（最大700px）。スマホ前提で作られたページはこのまま
 * - interview-chat: 画面の高さに収め、チャットの入力欄を下に固定する
 */
export function MainLayout({ header, footer, children }: MainLayoutProps) {
  const pathname = usePathname();
  const kind = getMainLayoutKind(pathname);

  return (
    <div
      className={cn(
        "flex flex-col",
        kind === "interview-chat" ? "h-dvh overflow-hidden" : "min-h-dvh"
      )}
    >
      {header}
      <main
        className={cn(
          "flex flex-1 flex-col",
          kind === "interview-chat" && "min-h-0"
        )}
      >
        {kind === "wide" ? (
          children
        ) : (
          <div
            className={cn(
              "mx-auto flex w-full max-w-[700px] flex-1 flex-col bg-mirai-surface",
              kind === "interview-chat" && "min-h-0",
              // インタビューは背景と地続きに見せたいので影を付けない
              !isInterviewSection(pathname) && "sm:shadow-lg"
            )}
          >
            {children}
          </div>
        )}
      </main>
      {footer}
    </div>
  );
}
