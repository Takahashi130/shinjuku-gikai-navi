import { CircleDashed, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ComingSoonTag } from "@/components/coming-soon-tag";
import { cn } from "@/lib/utils";

interface ComingSoonCardProps {
  title: string;
  /** 何ができるようになるのか。まだ無い数字や結果は書かない。 */
  description: ReactNode;
  icon?: LucideIcon;
  /** 予定していること。箇条書きで出す。 */
  points?: readonly string[];
  /** dark は濃色の帯（「あなたの意思を投じる」の位置など）に置くとき。 */
  tone?: "light" | "dark";
  /**
   * lg はページに直接置くとき、md はカードの中に入れ子にするとき（狭い画面では
   * 外のカードの余白と重なるので、余白を少し詰める）。
   */
  radius?: "lg" | "md";
  /** 見出しの階層。置く場所の前後の見出しに合わせる（既定は h3）。 */
  headingLevel?: "h2" | "h3" | "h4";
  /** 実在するページへのリンクなど、補足を添えるとき。 */
  children?: ReactNode;
  className?: string;
}

/**
 * まだ無い機能の「準備中」の説明カード。
 *
 * 押せそうで押せないボタン（無効表示のボタンも含む）は置かない。何が
 * できるようになるのかを文で書き、「準備中」の印を添える。実データの面と
 * 見分けられるよう、枠は破線にする。
 *
 * 狭い画面では本文の幅を取るため、アイコンを見出しの上に置く。
 */
export function ComingSoonCard({
  title,
  description,
  icon: Icon = CircleDashed,
  points,
  tone = "light",
  radius = "lg",
  headingLevel: Heading = "h3",
  children,
  className,
}: ComingSoonCardProps) {
  const dark = tone === "dark";

  return (
    <div
      data-slot="coming-soon-card"
      data-surface={dark ? "dark" : undefined}
      className={cn(
        "flex flex-col gap-3",
        radius === "lg" ? "rounded-3xl p-5" : "rounded-2xl p-4 sm:p-5",
        dark
          ? "bg-brand-header text-brand-on-header"
          : "border border-dashed border-mirai-border bg-white text-mirai-text",
        className
      )}
    >
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            dark
              ? "bg-brand-header-hover text-brand-on-header"
              : "bg-mirai-surface text-mirai-text-muted"
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <Heading className="flex flex-wrap items-center gap-2 text-base font-bold leading-snug">
            {title}
            <ComingSoonTag tone={dark ? "dark" : "light"} />
          </Heading>
          <p
            className={cn(
              "text-sm leading-relaxed",
              dark ? "text-brand-on-header-muted" : "text-mirai-text-secondary"
            )}
          >
            {description}
          </p>
        </div>
      </div>

      {points && points.length > 0 && (
        <ul
          aria-label="予定していること"
          className={cn(
            "flex flex-col gap-1.5 rounded-2xl px-4 py-3 text-sm",
            dark
              ? "bg-brand-header-sub text-brand-on-header"
              : "bg-mirai-surface text-mirai-text"
          )}
        >
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 leading-relaxed">
              <CircleDashed
                className={cn(
                  "mt-1 size-3.5 shrink-0",
                  dark ? "text-brand-accent" : "text-mirai-text-muted"
                )}
                aria-hidden
              />
              {point}
            </li>
          ))}
        </ul>
      )}

      {children}
    </div>
  );
}
