import { ArrowRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: ReactNode;
  /** 見出しの id。section の aria-labelledby に使う。 */
  id?: string;
  /** 見出しの下の1〜2行の説明。 */
  description?: ReactNode;
  /** 見出しの左の目印。 */
  icon?: LucideIcon;
  /** 右端の「すべて見る」など。行き先のあるときだけ渡す。 */
  action?: { href: Route; label: string };
  as?: "h1" | "h2" | "h3";
  className?: string;
}

/**
 * セクションの見出し。大きめの見出し＋説明＋右端の「すべて見る」。
 * トップ・一覧・あとから組み込む画面で、見出しの大きさと余白をそろえる。
 *
 * 見出しは文節で折り返す（break-phrase）。短い見出しを前提にしているので、
 * 議案名のような長い固有名は title に入れない。
 */
export function SectionHeading({
  title,
  id,
  description,
  icon: Icon,
  action,
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-2",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-link">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <Heading
            id={id}
            className="break-phrase text-xl font-extrabold leading-snug tracking-tight text-mirai-text md:text-2xl"
          >
            {title}
          </Heading>
          {description && (
            <p className="text-sm leading-relaxed text-mirai-text-secondary">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        // 押せる範囲は上下に広げ（44px）、行の高さは変えない
        <Link
          href={action.href}
          className="-my-3 inline-flex min-h-11 shrink-0 items-center gap-1 py-3 text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
        >
          {action.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
