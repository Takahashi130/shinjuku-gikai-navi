import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  /** 数字の名前（例：「審議中の議案」）。 */
  label: string;
  /** 大きく出す数字。数値なら3桁ごとに区切る。 */
  value: number | string;
  /** 数字のあとの単位（例：「件」）。 */
  unit?: string;
  /** 数字の下の補足（例：会期名と閉会までの日数）。 */
  note?: ReactNode;
  /** 名前の右に添える小さなピル。 */
  badge?: ReactNode;
  /** 数字の色。accent は緑（区民の側の数字など）。 */
  valueTone?: "default" | "accent";
  /** dark は濃色の面（強調したい1枚だけに使う）。 */
  tone?: "dark" | "light";
  /** 数字の中身の一覧などへ送るとき。カード全体がリンクになる。 */
  href?: Route;
  /**
   * リンクの末尾に出す文言（見た目の手がかり）。読み上げでは、名前と数字から
   * 行き先が分かり、同じ語を2回読むことになるので読ませない。
   */
  linkLabel?: string;
  className?: string;
}

/**
 * 大きな数字のカード。トップのヒーローや、あとから組み込む集計の画面で使う。
 *
 * 数字は DB などから取れた実際の値だけを出すこと。まだ集計できない数字は
 * このカードではなく ComingSoonCard で「準備中」と書く。
 */
export function StatCard({
  label,
  value,
  unit,
  note,
  badge,
  tone = "light",
  valueTone = "default",
  href,
  linkLabel = "一覧を見る",
  className,
}: StatCardProps) {
  const dark = tone === "dark";
  const displayValue =
    typeof value === "number" ? value.toLocaleString("ja-JP") : value;

  const body = (
    <>
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-bold",
            dark ? "text-brand-on-header-muted" : "text-mirai-text-secondary"
          )}
        >
          {label}
        </span>
        {badge}
      </span>
      <span className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-lexend text-4xl font-bold leading-none tracking-tight md:text-5xl",
            dark
              ? "text-white"
              : valueTone === "accent"
                ? "text-brand-link"
                : "text-mirai-text"
          )}
        >
          {displayValue}
        </span>
        {unit && (
          <span
            className={cn(
              "text-sm font-bold",
              dark ? "text-brand-on-header" : "text-mirai-text-secondary"
            )}
          >
            {unit}
          </span>
        )}
      </span>
      {note && (
        <span
          className={cn(
            "border-t pt-2 text-xs leading-relaxed",
            dark
              ? "border-brand-header-hover text-brand-on-header-muted"
              : "border-line-soft text-mirai-text-muted"
          )}
        >
          {note}
        </span>
      )}
      {href && (
        <span
          aria-hidden
          className={cn(
            "mt-auto inline-flex items-center gap-1 text-xs font-bold group-hover:underline",
            dark ? "text-brand-on-header" : "text-brand-link"
          )}
        >
          {linkLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      )}
    </>
  );

  const cardClass = cn(
    "flex h-full flex-col gap-3 rounded-3xl p-5",
    dark
      ? "bg-brand-header text-brand-on-header shadow-lg"
      : "border border-brand-accent-light/70 bg-white text-mirai-text shadow-sm",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        data-surface={dark ? "dark" : undefined}
        className={cn(
          cardClass,
          "group transition-shadow hover:shadow-md",
          !dark && "hover:border-brand-link/40"
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div data-surface={dark ? "dark" : undefined} className={cardClass}>
      {body}
    </div>
  );
}
