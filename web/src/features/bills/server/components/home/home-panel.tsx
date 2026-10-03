import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * トップのカード・列の白いパネル。見出しと「もっと見る」の位置を揃える。
 * 背景は薄いグレー（bg-page）、パネルは白・角丸小さめ。
 */
export function HomePanel({
  title,
  titleId,
  subtitle,
  more,
  className,
  children,
}: {
  title: ReactNode;
  titleId: string;
  subtitle?: ReactNode;
  /** 見出しの右（狭い画面では下）に置く「もっと見る」。 */
  more?: { href: Route; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col rounded-md bg-white p-4 md:p-5", className)}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id={titleId}
          className="text-lg font-bold leading-snug text-mirai-text md:text-xl"
        >
          {title}
        </h2>
        {subtitle && (
          <span className="text-xs text-mirai-text-muted">{subtitle}</span>
        )}
        {/* 押せる範囲は上下に広げ、見出しの行の高さは変えない */}
        {more && (
          <Link
            href={more.href}
            className="-my-3 ml-auto py-3 text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
          >
            {more.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
