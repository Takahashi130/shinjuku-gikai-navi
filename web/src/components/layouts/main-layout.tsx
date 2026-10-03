"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getMainLayoutKind, isInterviewSection } from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

/** 本文（main）の id。スキップリンクの行き先。 */
const MAIN_CONTENT_ID = "main-content";

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
 *
 * 先頭に「本文へ移動」のリンクを置く（フォーカスしたときだけ見える）。
 * ヘッダーにはロゴ・検索・表示設定・タブ4つ・お知らせ帯のリンクが並ぶので、
 * キーボードで操作する人が毎回それを通らずに済むようにする。
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
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only rounded-full bg-white text-sm font-bold text-brand-link shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-3"
      >
        本文へ移動
      </a>
      {header}
      <main
        id={MAIN_CONTENT_ID}
        // スキップリンクで移ったとき、読み上げとキーボードの位置も本文に移す
        tabIndex={-1}
        className={cn(
          "flex flex-1 flex-col outline-none",
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
