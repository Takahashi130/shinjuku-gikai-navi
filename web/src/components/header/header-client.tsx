"use client";

import { CalendarClock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComingSoonTag } from "@/components/coming-soon-tag";
import { SITE } from "@/config/site";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BillTag } from "@/features/bills/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { sendDifficultyStateEvent } from "@/lib/analytics/preference-state-events";
import { useOnPageView } from "@/lib/analytics/use-on-page-view";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AllMenu } from "./all-menu";
import { DisplaySettings } from "./display-settings";
import {
  buildHeaderBandLinks,
  type HeaderNavLink,
  type SessionPillLink,
} from "./header-nav";
import { HeaderSearch } from "./header-search";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
  /** テーマ（掲載タグ）。帯と「すべて」メニューに並べる。 */
  themes: BillTag[];
  /** 会期別の一覧へのリンク（新しい順）。 */
  sessionLinks: HeaderNavLink[];
  /** 今の会期のピル。閉会中は null。 */
  sessionPill: SessionPillLink | null;
}

/**
 * 濃色の帯の上のリンク。Amazon と同じく、ホバーで白い枠を出す。
 *
 * 帯は横にスクロールする箱で、箱は中身を上下にも切り取る。フォーカスの枠を
 * 外側に出すと上下が欠けるので、枠は内側に描く（-outline-offset-2）。
 */
const BAND_LINK_CLASS =
  "flex h-9 items-center whitespace-nowrap rounded-sm border border-transparent px-2.5 text-[13px] font-bold text-brand-on-header hover:border-brand-on-header focus-visible:-outline-offset-2";

/**
 * サイト共通のヘッダー（Amazon 風の2段の帯）。
 *
 * - 上段（濃色）: ロゴとサービス名 / 検索バー / 表示設定・投票履歴（準備中）
 * - 下段（やや明るい）: 「≡ すべて」メニュー / よく使う絞り込みとテーマ / 今の会期のピル
 *
 * スマホでは検索バーを上段の下に全幅で出し、下段は横にスクロールさせる。
 * インタビューのチャットでは画面の高さを使うので、上段だけにする（ふりがなの
 * 切り替えは、チャットでも使えるよう上段に残す）。
 */
export function HeaderClient({
  difficultyLevel,
  themes,
  sessionLinks,
  sessionPill,
}: HeaderClientProps) {
  const pathname = usePathname();
  const showDifficulty = isMainPage(pathname);
  const isChat = isInterviewPage(pathname);

  // Headerは1ページに1つだけ常時マウントされるため、
  // ここで難易度設定をページ表示のたびにGAへ送る
  // (DifficultySelectorはmarkdown埋め込み等で複数箇所に
  //  同時マウントされ得るため、送信元には適さない)
  useOnPageView(() => sendDifficultyStateEvent(difficultyLevel));

  const bandLinks = buildHeaderBandLinks(themes);

  return (
    <header id="top" data-surface="dark" className="text-brand-on-header">
      {/* 上段 */}
      <div className="bg-brand-header">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-2 py-1.5 md:gap-4 md:px-4">
          <HeaderLogo compact={isChat} />

          {!isChat && (
            <div className="hidden min-w-0 flex-1 md:block">
              <HeaderSearch />
            </div>
          )}

          {/* 広い画面では検索バーが幅を取って右に押す。チャットには検索バーが無いので自分で右に寄せる */}
          <div
            className={cn(
              "ml-auto flex shrink-0 items-center gap-1",
              !isChat && "md:ml-0"
            )}
          >
            {isChat && <InterviewHeaderActions />}
            <DisplaySettings
              difficultyLevel={difficultyLevel}
              showDifficulty={!isChat && showDifficulty}
            />
            {!isChat && <VoteHistoryPlaceholder />}
          </div>
        </div>

        {!isChat && (
          <div className="px-2 pb-2.5 md:hidden">
            <HeaderSearch />
          </div>
        )}
      </div>

      {/* 下段 */}
      {!isChat && (
        <div className="bg-brand-header-sub">
          <div className="mx-auto flex h-10 max-w-[1500px] items-center gap-1 px-1 md:px-3">
            <AllMenu
              themes={themes}
              sessionLinks={sessionLinks}
              difficultyLevel={difficultyLevel}
              showDifficulty={showDifficulty}
            />
            <div className="relative min-w-0 flex-1">
              <nav
                aria-label="カテゴリ"
                className="scrollbar-hide overflow-x-auto"
              >
                {/* 右端のぼかしの下に最後のリンクが隠れないよう、右に余白を取る */}
                <ul className="flex w-max items-center pr-8">
                  {/* スマホでは右端に置く場所が無いので、帯の先頭に短くして出す */}
                  {sessionPill && (
                    <li className="pr-1 md:hidden">
                      <SessionPill link={sessionPill} size="compact" />
                    </li>
                  )}
                  {bandLinks.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={BAND_LINK_CLASS}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              {/*
                帯がまだ横に続くことを示すぼかし。スクロールバーは隠しているので、
                これが無いと右に続きがあると分からない。帯に並ばないテーマも
                「すべて」メニューから選べる。
              */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-brand-header-sub to-transparent"
              />
            </div>
            {sessionPill && (
              <div className="hidden shrink-0 md:block">
                <SessionPill link={sessionPill} size="wide" />
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * ロゴとサービス名。
 *
 * compact（インタビューのチャット）では、狭い画面で「保存して中断」と表示設定を
 * 並べる幅が足りないので、ロゴの記号だけにする（名前はリンクの aria-label にある）。
 */
function HeaderLogo({ compact }: { compact: boolean }) {
  return (
    <Link
      href={routes.home()}
      aria-label={`${SITE.NAME} トップページ`}
      className="flex min-w-0 shrink-0 items-center gap-2 rounded-sm border border-transparent px-1 py-1 hover:border-brand-on-header"
    >
      <Image
        src="/img/logo.svg"
        alt=""
        width={36}
        height={36}
        priority
        className="size-8 shrink-0 md:size-9"
      />
      <span
        className={cn(
          "min-w-0 flex-col leading-tight",
          compact ? "hidden sm:flex" : "flex"
        )}
      >
        <span className="whitespace-nowrap text-base font-extrabold tracking-wide text-brand-on-header md:text-lg">
          {SITE.NAME}
        </span>
        <span className="whitespace-nowrap text-[11px] font-bold text-brand-accent sm:text-xs">
          {SITE.CATCHPHRASE}
        </span>
      </span>
    </Link>
  );
}

/**
 * 「あなたの投票履歴」。投票機能はまだ無いので、リンクにせず準備中と添える。
 * 押せそうに見えないよう、ホバーの枠も付けず文字を控えめにする。
 */
function VoteHistoryPlaceholder() {
  return (
    <div className="hidden flex-col px-2 py-1 leading-tight lg:flex">
      <span className="text-[11px] font-medium text-brand-on-header-muted">
        あなたの
      </span>
      <span className="flex items-center gap-1.5 text-sm font-bold text-brand-on-header-muted">
        投票履歴
        <ComingSoonTag tone="dark" />
      </span>
    </div>
  );
}

/**
 * 今の会期のピル。
 *
 * compact（スマホの帯の先頭）は「あと12日」だけにする。会期名まで出すと帯の
 * 幅をほとんど使ってしまい、カテゴリのリンクが見えなくなる。wide（広い画面の
 * 右端）は、さらに広い画面でだけ会期名まで出す。
 * どの幅でも、読み上げには会期名を含む完全な言い方を渡す。
 */
function SessionPill({
  link,
  size,
}: {
  link: SessionPillLink;
  size: "compact" | "wide";
}) {
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-accent px-3 text-xs font-bold text-brand-on-accent hover:bg-brand-accent-hover",
        // 帯（横スクロールの箱）の中では、フォーカスの枠が切れないよう内側に描く
        size === "compact" ? "h-9 focus-visible:-outline-offset-2" : "h-8"
      )}
    >
      <CalendarClock className="size-3.5" aria-hidden />
      {size === "compact" ? (
        <span aria-hidden>{link.shortLabel}</span>
      ) : (
        <>
          <span aria-hidden className="pcl:hidden">
            {link.daysLeftLabel}
          </span>
          <span aria-hidden className="hidden pcl:inline">
            {link.label}
          </span>
        </>
      )}
      <span className="sr-only">{link.label}</span>
    </Link>
  );
}
