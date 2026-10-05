"use client";

import { ArrowRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ComingSoonTag } from "@/components/coming-soon-tag";
import { Button } from "@/components/ui/button";
import { LabelPill } from "@/components/ui/label-pill";
import { SITE } from "@/config/site";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { billsSearchHref } from "@/features/bills/shared/utils/parse-bills-list-params";
import type { SessionNotice } from "@/features/diet-sessions/shared/utils/session-notice";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { sendDifficultyStateEvent } from "@/lib/analytics/preference-state-events";
import { useOnPageView } from "@/lib/analytics/use-on-page-view";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { DisplaySettings } from "./display-settings";
import {
  getActiveHeaderTabId,
  getHeaderTabAriaCurrent,
  HEADER_TABS,
  type HeaderTabId,
} from "./header-nav";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
  /** ヘッダーの下の全幅のお知らせ帯。出すものが無ければ null。 */
  notice: SessionNotice | null;
}

/**
 * サイト共通のヘッダー（白地）。
 *
 * - 1段目：ロゴの枠・サービス名・β版・1行の説明 / 検索・表示設定
 * - 2段目：ハッシュタグ型のタブ（選択中は塗りの角丸ピル）
 * - 3段目：全幅のお知らせ帯（会期の状況）
 *
 * インタビューのチャットでは画面の高さを使うので、1段目だけにする（ふりがなの
 * 切り替えは、チャットでも使えるよう残す）。
 */
export function HeaderClient({ difficultyLevel, notice }: HeaderClientProps) {
  const pathname = usePathname();
  const showDifficulty = isMainPage(pathname);
  const isChat = isInterviewPage(pathname);

  // Headerは1ページに1つだけ常時マウントされるため、
  // ここで難易度設定をページ表示のたびにGAへ送る
  // (DifficultySelectorはmarkdown埋め込み等で複数箇所に
  //  同時マウントされ得るため、送信元には適さない)
  useOnPageView(() => sendDifficultyStateEvent(difficultyLevel));

  return (
    <header id="top" className="border-line-soft border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <HeaderLogo compact={isChat} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isChat ? (
            <InterviewHeaderActions />
          ) : (
            <Button
              asChild
              variant="outline"
              className="size-11 rounded-full border-line-soft p-0 shadow-none"
            >
              <Link href={billsSearchHref()} aria-label="議案を検索">
                <Search className="size-[18px]" aria-hidden />
              </Link>
            </Button>
          )}
          <DisplaySettings
            difficultyLevel={difficultyLevel}
            showDifficulty={!isChat && showDifficulty}
          />
        </div>
      </div>

      {!isChat && <HeaderTabs pathname={pathname} />}
      {!isChat && notice && <NoticeBand notice={notice} />}
    </header>
  );
}

/**
 * ロゴの枠とサービス名。
 *
 * compact（インタビューのチャット）では、狭い画面で「保存して中断」と表示設定を
 * 並べる幅が足りないので、ロゴの記号だけにする（名前はリンクの aria-label にある）。
 *
 * 360px 未満では、右の検索・表示設定のボタンと重ならないよう β版の印を隠す。
 */
function HeaderLogo({ compact }: { compact: boolean }) {
  return (
    <Link
      href={routes.home()}
      aria-label={`${SITE.NAME} トップページ`}
      className="group flex min-w-0 items-center gap-3 rounded-full"
    >
      {/* ロゴとサービス名を緑の枠のピルで囲む */}
      <span className="flex shrink-0 items-center gap-2 rounded-full border-2 border-brand-accent bg-white py-1 pr-1 pl-1 shadow-xs group-hover:bg-brand-accent-tint sm:pr-4">
        <Image
          src="/img/logo.svg"
          alt=""
          width={32}
          height={32}
          priority
          className="size-7 md:size-8"
        />
        <span
          className={cn(
            "whitespace-nowrap text-base font-extrabold tracking-wide text-brand-link md:text-lg",
            compact ? "hidden sm:inline" : "inline"
          )}
        >
          {SITE.NAME}
        </span>
      </span>
      <span
        className={cn(
          "min-w-0 flex-col leading-tight",
          compact ? "hidden" : "hidden min-[360px]:flex"
        )}
      >
        <LabelPill tone="accent" className="h-5 w-fit px-2">
          β版
        </LabelPill>
        <span className="mt-0.5 hidden truncate text-xs text-mirai-text-muted md:block">
          {SITE.CATCHPHRASE}
        </span>
      </span>
    </Link>
  );
}

/**
 * ハッシュタグ型のタブ。狭い画面では横にスクロールさせ、右端をぼかして
 * 続きがあることを示す（scroll-fade-right。末尾に余白を足しているので、
 * 端までスクロールすれば何も隠れない）。
 *
 * スクロールする箱は中身を上下にも切り取るので、フォーカスの枠は内側に描く
 * （-outline-offset-2）。「#」は飾りなので読み上げない。
 */
function HeaderTabs({ pathname }: { pathname: string }) {
  const activeId: HeaderTabId | null = getActiveHeaderTabId(pathname);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // 狭い画面で右のタブを開いたとき、選択中のタブが帯の外に隠れないよう
  // 帯だけを横にずらす（ページ全体はスクロールさせない）。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 選択中のタブが変わったときだけ動かす
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;
    // 帯（scroller）を relative にしているので、offsetLeft は帯の中での位置
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (
      left < scroller.scrollLeft ||
      right > scroller.scrollLeft + scroller.clientWidth
    ) {
      scroller.scrollLeft = Math.max(0, left - 16);
    }
  }, [activeId]);

  return (
    <nav
      aria-label="サービスの切り替え"
      className="border-line-soft border-t bg-brand-accent-tint/60"
    >
      <div
        ref={scrollerRef}
        className="scrollbar-hide scroll-fade-right relative mx-auto max-w-6xl overflow-x-auto px-4 py-1"
      >
        <ul className="flex w-max items-center gap-1.5 pr-6">
          {HEADER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeId;
            return (
              <li key={tab.id}>
                <Link
                  ref={active ? activeRef : undefined}
                  href={tab.href}
                  aria-current={getHeaderTabAriaCurrent(tab, pathname)}
                  className={cn(
                    "flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold focus-visible:-outline-offset-2",
                    active
                      ? "bg-brand-band text-white shadow-sm"
                      : "text-mirai-text-secondary hover:bg-white hover:text-brand-link"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      // 見本どおり、中継のタブだけ赤い印にする
                      tab.id === "live" && !active && "text-stance-against"
                    )}
                    aria-hidden
                  />
                  <span>
                    <span aria-hidden>#</span>
                    {tab.label}
                  </span>
                  {tab.comingSoon && (
                    <ComingSoonTag tone={active ? "dark" : "light"} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** 全幅のお知らせ帯。いまの会期の状況と、その会期の議案へのリンク。 */
function NoticeBand({ notice }: { notice: SessionNotice }) {
  return (
    <div data-surface="dark" className="bg-brand-band px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-6xl items-start gap-2 text-xs font-bold leading-relaxed sm:items-center sm:justify-center md:text-[13px]">
        <span
          aria-hidden
          className={cn(
            "mt-[7px] size-2 shrink-0 rounded-full sm:mt-0",
            notice.status === "open"
              ? "bg-brand-accent-light"
              : "bg-brand-on-band-muted"
          )}
        />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span>{notice.text}</span>
          {/* 押せる範囲は上下に広げ（44px）、帯の高さは変えない */}
          <Link
            href={notice.link.href}
            className="-my-[11px] inline-flex min-h-11 items-center gap-1 text-white underline underline-offset-4 hover:text-brand-on-band-muted"
          >
            {notice.link.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>
    </div>
  );
}
